import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async findPolls(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.poll.findMany({
      where: {
        eventId,
      },
      include: {
        options: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createPoll(
    user: AuthenticatedUser,
    eventId: string,
    createPollDto: CreatePollDto,
  ) {
    const event = await this.findEventForMutation(user, eventId);
    const options = this.normalizePollOptions(createPollDto.options);

    const poll = await this.prisma.poll.create({
      data: {
        eventId: event.id,
        question: createPollDto.question.trim(),
        options: {
          create: options.map((label, index) => ({
            label,
            order: index,
          })),
        },
      },
      include: {
        options: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    await this.createAuditLog(user, 'POLL_CREATED', 'Poll', poll.id, {
      eventId: event.id,
      eventTitle: event.title,
      question: poll.question,
      optionCount: poll.options.length,
    });

    return poll;
  }

  async updatePoll(
    user: AuthenticatedUser,
    id: string,
    updatePollDto: UpdatePollDto,
  ) {
    const existingPoll = await this.findPollForMutation(user, id);

    const poll = await this.prisma.poll.update({
      where: {
        id: existingPoll.id,
      },
      data: {
        question: updatePollDto.question?.trim(),
        status: updatePollDto.status,
      },
      include: {
        options: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    await this.createAuditLog(user, 'POLL_UPDATED', 'Poll', poll.id, {
      eventId: existingPoll.event.id,
      eventTitle: existingPoll.event.title,
      question: poll.question,
      status: poll.status,
    });

    return poll;
  }

  async deletePoll(user: AuthenticatedUser, id: string) {
    const existingPoll = await this.findPollForMutation(user, id);

    await this.prisma.poll.delete({
      where: {
        id: existingPoll.id,
      },
    });

    await this.createAuditLog(user, 'POLL_DELETED', 'Poll', existingPoll.id, {
      eventId: existingPoll.event.id,
      eventTitle: existingPoll.event.title,
      question: existingPoll.question,
    });

    return {
      id: existingPoll.id,
      deleted: true,
    };
  }

  async getPollResults(user: AuthenticatedUser, id: string) {
    const poll = await this.findPollForRead(user, id);
    const totalVotes = poll.options.reduce(
      (total, option) => total + option._count.votes,
      0,
    );

    return {
      id: poll.id,
      eventId: poll.eventId,
      question: poll.question,
      status: poll.status,
      totalVotes,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        order: option.order,
        votes: option._count.votes,
        percentage:
          totalVotes > 0
            ? Math.round((option._count.votes / totalVotes) * 100)
            : 0,
      })),
    };
  }

  async findQuestions(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.question.findMany({
      where: {
        eventId,
      },
      orderBy: [
        {
          isAnswered: 'asc',
        },
        {
          upvotes: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async markQuestionAnswered(user: AuthenticatedUser, id: string) {
    const existingQuestion = await this.findQuestionForMutation(user, id);

    if (existingQuestion.isAnswered) {
      return existingQuestion;
    }

    const question = await this.prisma.question.update({
      where: {
        id: existingQuestion.id,
      },
      data: {
        isAnswered: true,
        answeredAt: new Date(),
      },
    });

    await this.createAuditLog(
      user,
      'QUESTION_ANSWERED',
      'Question',
      question.id,
      {
        eventId: existingQuestion.event.id,
        eventTitle: existingQuestion.event.title,
        question: question.question,
      },
    );

    return question;
  }

  async findFeedback(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.feedback.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async findEventForRead(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    return event;
  }

  private async findEventForMutation(user: AuthenticatedUser, id: string) {
    const event = await this.findEventForRead(user, id);

    this.assertCanMutateEvent(user, event.createdById);

    return event;
  }

  private async findPollForRead(user: AuthenticatedUser, id: string) {
    const poll = await this.prisma.poll.findFirst({
      where: {
        id,
        event: {
          workspaceId: user.workspaceId,
          archivedAt: null,
        },
      },
      include: {
        event: true,
        options: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    this.assertCanAccessEvent(user, poll.event.createdById);

    return poll;
  }

  private async findPollForMutation(user: AuthenticatedUser, id: string) {
    const poll = await this.findPollForRead(user, id);

    this.assertCanMutateEvent(user, poll.event.createdById);

    return poll;
  }

  private async findQuestionForMutation(user: AuthenticatedUser, id: string) {
    const question = await this.prisma.question.findFirst({
      where: {
        id,
        event: {
          workspaceId: user.workspaceId,
          archivedAt: null,
        },
      },
      include: {
        event: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    this.assertCanMutateEvent(user, question.event.createdById);

    return question;
  }

  private normalizePollOptions(options: string[]) {
    const normalizedOptions = options
      .map((option) => option.trim())
      .filter(Boolean);
    const uniqueOptions = Array.from(new Set(normalizedOptions));

    if (uniqueOptions.length < 2) {
      throw new BadRequestException(
        'A poll requires at least two unique options',
      );
    }

    return uniqueOptions;
  }

  private assertCanAccessEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.EVENT_MANAGER && createdById !== user.id) {
      throw new ForbiddenException('You can only access events you own');
    }
  }

  private assertCanMutateEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.EVENT_MANAGER && createdById === user.id) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to modify this event',
    );
  }

  private async createAuditLog(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }
}

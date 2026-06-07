'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  MessageSquareText,
  Radio,
  Save,
  Star,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type PollStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

type EventSummary = {
  id: string;
  title: string;
  status: string;
};

type Poll = {
  id: string;
  eventId: string;
  question: string;
  status: PollStatus;
  options: Array<{
    id: string;
    pollId: string;
    label: string;
    order: number;
    _count: {
      votes: number;
    };
  }>;
  createdAt: string;
  updatedAt: string;
};

type Question = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  question: string;
  upvotes: number;
  isAnswered: boolean;
  answeredAt: string | null;
  createdAt: string;
};

type Feedback = {
  id: string;
  eventId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type PollFormState = {
  question: string;
  options: string;
};

const defaultPollFormState: PollFormState = {
  question: '',
  options: 'Yes\nNo',
};

const pollStatuses: PollStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];

const pollStatusStyles: Record<PollStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  OPEN: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  CLOSED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
};

export default function EventEngagementPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pollFormState, setPollFormState] =
    useState<PollFormState>(defaultPollFormState);

  const canManageEngagement =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventSummary>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const pollsQuery = useQuery({
    queryKey: ['events', eventId, 'polls'],
    queryFn: () => apiRequest<Poll[]>(`/events/${eventId}/polls`),
    enabled: Boolean(eventId),
  });

  const questionsQuery = useQuery({
    queryKey: ['events', eventId, 'questions'],
    queryFn: () => apiRequest<Question[]>(`/events/${eventId}/questions`),
    enabled: Boolean(eventId),
  });

  const feedbackQuery = useQuery({
    queryKey: ['events', eventId, 'feedback'],
    queryFn: () => apiRequest<Feedback[]>(`/events/${eventId}/feedback`),
    enabled: Boolean(eventId),
  });

  const polls = useMemo(() => pollsQuery.data ?? [], [pollsQuery.data]);
  const questions = useMemo(
    () => questionsQuery.data ?? [],
    [questionsQuery.data],
  );
  const feedback = useMemo(() => feedbackQuery.data ?? [], [feedbackQuery.data]);
  const summary = useMemo(
    () => buildEngagementSummary(polls, questions, feedback),
    [feedback, polls, questions],
  );

  const createPollMutation = useMutation({
    mutationFn: () =>
      apiRequest<Poll>(`/events/${eventId}/polls`, {
        method: 'POST',
        body: JSON.stringify({
          question: pollFormState.question.trim(),
          options: normalizeOptions(pollFormState.options),
        }),
      }),
    onSuccess: async () => {
      await invalidateEngagementQueries(queryClient, eventId);
      setPollFormState(defaultPollFormState);
      toast.success('Poll created');
    },
    onError: () => {
      toast.error('Poll could not be created');
    },
  });

  const updatePollMutation = useMutation({
    mutationFn: ({ pollId, status }: { pollId: string; status: PollStatus }) =>
      apiRequest<Poll>(`/polls/${pollId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await invalidateEngagementQueries(queryClient, eventId);
      toast.success('Poll status updated');
    },
    onError: () => {
      toast.error('Poll status could not be updated');
    },
  });

  const deletePollMutation = useMutation({
    mutationFn: (pollId: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/polls/${pollId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await invalidateEngagementQueries(queryClient, eventId);
      toast.success('Poll deleted');
    },
    onError: () => {
      toast.error('Poll could not be deleted');
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      apiRequest<Question>(`/questions/${questionId}/answer`, {
        method: 'PATCH',
      }),
    onSuccess: async () => {
      await invalidateEngagementQueries(queryClient, eventId);
      toast.success('Question marked as answered');
    },
    onError: () => {
      toast.error('Question could not be updated');
    },
  });

  const handleCreatePoll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pollFormState.question.trim().length < 5) {
      toast.error('Poll question must be at least 5 characters');
      return;
    }

    if (normalizeOptions(pollFormState.options).length < 2) {
      toast.error('Polls require at least two unique options');
      return;
    }

    await createPollMutation.mutateAsync();
  };

  const isLoading =
    pollsQuery.isLoading || questionsQuery.isLoading || feedbackQuery.isLoading;
  const isError =
    pollsQuery.isError || questionsQuery.isError || feedbackQuery.isError;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Event detail
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Engagement
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {eventQuery.data?.title ??
              'Manage polls, Q&A and feedback signals for this event.'}
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {summary.totalInteractions} interactions
        </div>
      </div>

      {isLoading ? (
        <EngagementSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Engagement data could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Radio}
              label="Polls"
              value={polls.length}
              detail={`${summary.openPolls} open`}
            />
            <SummaryCard
              icon={Users}
              label="Poll votes"
              value={summary.totalVotes}
              detail="Seed participation"
            />
            <SummaryCard
              icon={MessageSquareText}
              label="Unanswered Q&A"
              value={summary.unansweredQuestions}
              detail={`${questions.length} total questions`}
            />
            <SummaryCard
              icon={Star}
              label="Feedback score"
              value={summary.averageFeedbackScore}
              detail={`${feedback.length} responses`}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Poll builder
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Add planned interaction moments without real-time sockets.
                  </p>
                </div>
                <Radio className="h-5 w-5 text-emerald-600" />
              </div>

              {canManageEngagement ? (
                <form className="space-y-5 p-5" onSubmit={handleCreatePoll}>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Question
                    </label>
                    <input
                      value={pollFormState.question}
                      onChange={(event) =>
                        setPollFormState((current) => ({
                          ...current,
                          question: event.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="Which topic should we cover next?"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Options
                    </label>
                    <textarea
                      value={pollFormState.options}
                      onChange={(event) =>
                        setPollFormState((current) => ({
                          ...current,
                          options: event.target.value,
                        }))
                      }
                      className={`${inputClassName} min-h-28 py-3`}
                      placeholder="One option per line"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Use new lines or commas. Duplicate options are removed by
                      the backend.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                    Polls start in Draft. Open or close them from the poll list.
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={createPollMutation.isPending}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Create poll
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 text-sm text-slate-500">
                  Your current role can view engagement tools but cannot manage
                  polls.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">Polls</h2>
                <Radio className="h-5 w-5 text-emerald-600" />
              </div>
              {polls.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="text-sm font-medium text-slate-900">
                    No polls configured
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a poll to improve the event engagement setup.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {polls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      canManage={canManageEngagement}
                      isUpdating={updatePollMutation.isPending}
                      isDeleting={
                        deletePollMutation.isPending &&
                        deletePollMutation.variables === poll.id
                      }
                      onStatusChange={(status) =>
                        updatePollMutation.mutate({
                          pollId: poll.id,
                          status,
                        })
                      }
                      onDelete={() => deletePollMutation.mutate(poll.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">Q&A</h2>
                <MessageSquareText className="h-5 w-5 text-emerald-600" />
              </div>
              {questions.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No attendee questions yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {questions.map((question) => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      canAnswer={canManageEngagement}
                      isAnswering={
                        answerQuestionMutation.isPending &&
                        answerQuestionMutation.variables === question.id
                      }
                      onAnswer={() =>
                        answerQuestionMutation.mutate(question.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Feedback
                </h2>
                <Star className="h-5 w-5 text-emerald-600" />
              </div>
              {feedback.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No feedback responses yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {feedback.slice(0, 12).map((item) => (
                    <FeedbackRow key={item.id} feedback={item} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 truncate text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function PollCard({
  poll,
  canManage,
  isUpdating,
  isDeleting,
  onStatusChange,
  onDelete,
}: {
  poll: Poll;
  canManage: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  onStatusChange: (status: PollStatus) => void;
  onDelete: () => void;
}) {
  const totalVotes = getPollVoteCount(poll);

  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${pollStatusStyles[poll.status]}`}
            >
              {formatEnum(poll.status)}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {totalVotes} votes
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-950">
            {poll.question}
          </h3>
          <div className="mt-4 space-y-3">
            {poll.options.map((option) => {
              const percentage =
                totalVotes > 0
                  ? Math.round((option._count.votes / totalVotes) * 100)
                  : 0;

              return (
                <div key={option.id}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {option.label}
                    </span>
                    <span className="text-slate-500">
                      {option._count.votes} / {percentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {canManage ? (
          <div className="flex gap-2">
            <select
              value={poll.status}
              disabled={isUpdating}
              onChange={(event) =>
                onStatusChange(event.target.value as PollStatus)
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {pollStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatEnum(status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Delete poll"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function QuestionRow({
  question,
  canAnswer,
  isAnswering,
  onAnswer,
}: {
  question: Question;
  canAnswer: boolean;
  isAnswering: boolean;
  onAnswer: () => void;
}) {
  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {question.isAnswered ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Answered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Unanswered
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
              {question.upvotes}
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-700">{question.question}</p>
          <div className="mt-3 text-xs text-slate-500">
            {question.name} / {question.email} / {formatDate(question.createdAt)}
          </div>
        </div>

        {canAnswer && !question.isAnswered ? (
          <button
            type="button"
            onClick={onAnswer}
            disabled={isAnswering}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark answered
          </button>
        ) : null}
      </div>
    </article>
  );
}

function FeedbackRow({ feedback }: { feedback: Feedback }) {
  return (
    <article className="p-5">
      <div className="mb-2 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${
              index < feedback.rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-sm leading-6 text-slate-700">
        {feedback.comment || 'No written comment.'}
      </p>
      <div className="mt-3 text-xs text-slate-500">
        {formatDate(feedback.createdAt)}
      </div>
    </article>
  );
}

function EngagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

function buildEngagementSummary(
  polls: Poll[],
  questions: Question[],
  feedback: Feedback[],
) {
  const totalVotes = polls.reduce(
    (total, poll) => total + getPollVoteCount(poll),
    0,
  );
  const feedbackTotal = feedback.reduce((total, item) => total + item.rating, 0);

  return {
    openPolls: polls.filter((poll) => poll.status === 'OPEN').length,
    totalVotes,
    unansweredQuestions: questions.filter((question) => !question.isAnswered)
      .length,
    averageFeedbackScore:
      feedback.length > 0 ? Math.round(feedbackTotal / feedback.length) : 0,
    totalInteractions:
      totalVotes +
      questions.length +
      feedback.length,
  };
}

function getPollVoteCount(poll: Poll) {
  return poll.options.reduce(
    (total, option) => total + option._count.votes,
    0,
  );
}

function normalizeOptions(value: string) {
  const options = value
    .split(/[,\n]/)
    .map((option) => option.trim())
    .filter(Boolean);

  return Array.from(new Set(options));
}

async function invalidateEngagementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['events', eventId, 'polls'] }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'questions'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'feedback'],
    }),
    queryClient.invalidateQueries({ queryKey: ['events', eventId] }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'readiness'],
    }),
  ]);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const inputClassName =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

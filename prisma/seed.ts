import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const password = "password123";

async function main() {
  console.log("Seeding OpsPilot demo data...");

  await prisma.auditLog.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.mediaMarker.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.streamSetting.deleteMany();
  await prisma.analyticsSnapshot.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.question.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.contentModule.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.accessRule.deleteMany();
  await prisma.audienceGroup.deleteMany();
  await prisma.event.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(password, 10);

  const [admin, manager, analyst, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Morgan",
        email: "admin@opspilot.dev",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "Ben Carter",
        email: "manager@opspilot.dev",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "Clara Hughes",
        email: "analyst@opspilot.dev",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "Daniel Reed",
        email: "viewer@opspilot.dev",
        passwordHash,
      },
    }),
  ]);

  const workspace = await prisma.workspace.create({
    data: {
      name: "OpsPilot Demo Workspace",
      slug: "opspilot-demo",
      members: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: manager.id, role: "EVENT_MANAGER" },
          { userId: analyst.id, role: "ANALYST" },
          { userId: viewer.id, role: "VIEWER" },
        ],
      },
    },
  });

  const now = new Date();

  const eventDefinitions = [
    {
      title: "Q2 Product Launch Webinar",
      description: "Launch event for the new enterprise product suite.",
      eventType: "PRODUCT_LAUNCH" as const,
      status: "SCHEDULED" as const,
      startOffsetDays: 5,
      durationHours: 2,
      registrationTarget: 300,
    },
    {
      title: "Customer Onboarding Masterclass",
      description: "Training session for new customer success teams.",
      eventType: "CUSTOMER_ONBOARDING" as const,
      status: "SCHEDULED" as const,
      startOffsetDays: 12,
      durationHours: 1,
      registrationTarget: 180,
    },
    {
      title: "Internal Engineering Town Hall",
      description: "Monthly engineering update for product and platform teams.",
      eventType: "TOWN_HALL" as const,
      status: "LIVE" as const,
      startOffsetDays: 0,
      durationHours: 1,
      registrationTarget: 120,
    },
    {
      title: "Partner Training Session",
      description: "Enablement session for strategic implementation partners.",
      eventType: "TRAINING" as const,
      status: "DRAFT" as const,
      startOffsetDays: 20,
      durationHours: 2,
      registrationTarget: 90,
    },
    {
      title: "Enterprise Security Briefing",
      description: "Security and compliance briefing for enterprise customers.",
      eventType: "WEBINAR" as const,
      status: "COMPLETED" as const,
      startOffsetDays: -10,
      durationHours: 1,
      registrationTarget: 220,
    },
    {
      title: "AI Product Roadmap Session",
      description: "Roadmap preview for AI-assisted product capabilities.",
      eventType: "WEBINAR" as const,
      status: "SCHEDULED" as const,
      startOffsetDays: 3,
      durationHours: 1,
      registrationTarget: 250,
    },
    {
      title: "Developer Enablement Workshop",
      description: "Technical workshop for developer relations and platform users.",
      eventType: "TRAINING" as const,
      status: "COMPLETED" as const,
      startOffsetDays: -25,
      durationHours: 3,
      registrationTarget: 160,
    },
    {
      title: "Post-Event Replay Campaign",
      description: "Replay campaign for customers who missed the live launch.",
      eventType: "INTERNAL_LIVESTREAM" as const,
      status: "CANCELLED" as const,
      startOffsetDays: -4,
      durationHours: 1,
      registrationTarget: 100,
    },
  ];

  const events = [];

  for (const definition of eventDefinitions) {
    const startTime = addDays(now, definition.startOffsetDays);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + definition.durationHours);

    const event = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        createdById: manager.id,
        title: definition.title,
        description: definition.description,
        eventType: definition.eventType,
        status: definition.status,
        startTime,
        endTime,
        timezone: "Europe/London",
        registrationTarget: definition.registrationTarget,
      },
    });

    events.push(event);
  }

  const [launchEvent, onboardingEvent, townHallEvent, partnerEvent, securityEvent, aiRoadmapEvent, workshopEvent] = events;

  await prisma.streamSetting.createMany({
    data: [
      {
        eventId: launchEvent.id,
        ingestServerUrl: "rtmp://live.opspilot.dev/live",
        streamKey: `op_${launchEvent.id.slice(0, 8)}_product-launch`,
        streamStatus: "READY",
        recordingEnabled: true,
        lowLatencyMode: false,
        speakerTestCompleted: true,
        networkCheckCompleted: false,
        backupStreamEnabled: true,
        viewerUrl: `http://localhost:3000/watch/${launchEvent.id}`,
        mobileViewerUrl: `http://localhost:3000/watch/${launchEvent.id}?view=mobile`,
      },
      {
        eventId: townHallEvent.id,
        ingestServerUrl: "rtmp://live.opspilot.dev/live",
        streamKey: `op_${townHallEvent.id.slice(0, 8)}_town-hall`,
        streamStatus: "RECEIVING_SIGNAL",
        recordingEnabled: true,
        lowLatencyMode: true,
        speakerTestCompleted: true,
        networkCheckCompleted: true,
        backupStreamEnabled: false,
        viewerUrl: `http://localhost:3000/watch/${townHallEvent.id}`,
        mobileViewerUrl: `http://localhost:3000/watch/${townHallEvent.id}?view=mobile`,
      },
      {
        eventId: securityEvent.id,
        ingestServerUrl: "rtmp://live.opspilot.dev/live",
        streamKey: `op_${securityEvent.id.slice(0, 8)}_security`,
        streamStatus: "OFFLINE",
        recordingEnabled: true,
        lowLatencyMode: false,
        speakerTestCompleted: true,
        networkCheckCompleted: true,
        backupStreamEnabled: false,
        viewerUrl: `http://localhost:3000/watch/${securityEvent.id}`,
        mobileViewerUrl: `http://localhost:3000/watch/${securityEvent.id}?view=mobile`,
      },
    ],
  });

  await prisma.mediaAsset.create({
    data: {
      workspaceId: workspace.id,
      eventId: launchEvent.id,
      createdById: manager.id,
      title: "Q2 Product Launch Replay",
      description: "Edited replay package for customers who missed the launch webinar.",
      assetType: "REPLAY",
      source: "LIVE_RECORDING",
      status: "READY",
      durationSeconds: 5400,
      sizeBytes: 1_980_000_000,
      thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
      playbackUrl: "https://example.com/replays/q2-product-launch",
      markers: {
        create: [
          {
            timestampSeconds: 0,
            label: "Opening",
            note: "Host introduction and housekeeping.",
          },
          {
            timestampSeconds: 720,
            label: "Product keynote",
            note: "Main segment for replay clipping.",
          },
          {
            timestampSeconds: 3120,
            label: "Customer Q&A",
            note: "Good candidate for short highlight clips.",
          },
        ],
      },
    },
  });

  await prisma.mediaAsset.create({
    data: {
      workspaceId: workspace.id,
      eventId: townHallEvent.id,
      createdById: manager.id,
      title: "Engineering Town Hall Live Recording",
      description: "Raw live recording awaiting post-event review.",
      assetType: "VIDEO",
      source: "LIVE_RECORDING",
      status: "PROCESSING",
      durationSeconds: 3600,
      sizeBytes: 1442840576,
      thumbnailUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978",
      playbackUrl: "https://example.com/recordings/engineering-town-hall",
      markers: {
        create: [
          {
            timestampSeconds: 480,
            label: "Platform update",
            note: "Engineering roadmap segment.",
          },
          {
            timestampSeconds: 2100,
            label: "Leadership Q&A",
            note: "Internal-only discussion.",
          },
        ],
      },
    },
  });

  await prisma.mediaAsset.createMany({
    data: [
      {
        workspaceId: workspace.id,
        eventId: launchEvent.id,
        createdById: manager.id,
        title: "Launch Slides PDF",
        description: "Customer-facing slide deck for the product launch.",
        assetType: "SLIDES",
        source: "UPLOADED",
        status: "READY",
        sizeBytes: 18_432_000,
        thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
        playbackUrl: "https://example.com/resources/launch-slides.pdf",
      },
      {
        workspaceId: workspace.id,
        eventId: securityEvent.id,
        createdById: manager.id,
        title: "Enterprise Security Briefing Replay",
        description: "Replay export prepared for enterprise customer follow-up.",
        assetType: "REPLAY",
        source: "REPLAY_EXPORT",
        status: "READY",
        durationSeconds: 4200,
        sizeBytes: 1635778560,
        thumbnailUrl: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f",
        playbackUrl: "https://example.com/replays/security-briefing",
      },
      {
        workspaceId: workspace.id,
        eventId: onboardingEvent.id,
        createdById: manager.id,
        title: "Onboarding Workbook",
        description: "Resource file linked from the customer onboarding session.",
        assetType: "RESOURCE",
        source: "UPLOADED",
        status: "READY",
        sizeBytes: 7_480_000,
        thumbnailUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
        playbackUrl: "https://example.com/resources/onboarding-workbook.pdf",
      },
      {
        workspaceId: workspace.id,
        createdById: manager.id,
        title: "AI Roadmap Thumbnail Pack",
        description: "Visual assets prepared for the AI roadmap registration page.",
        assetType: "IMAGE",
        source: "UPLOADED",
        status: "READY",
        sizeBytes: 4_220_000,
        thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
        playbackUrl: "https://example.com/assets/ai-roadmap-thumbnails",
      },
      {
        workspaceId: workspace.id,
        eventId: workshopEvent.id,
        createdById: manager.id,
        title: "Developer Workshop Clip Export",
        description: "Short clip export for developer enablement follow-up.",
        assetType: "VIDEO",
        source: "REPLAY_EXPORT",
        status: "FAILED",
        durationSeconds: 540,
        sizeBytes: 312_000_000,
        thumbnailUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4",
        playbackUrl: "https://example.com/clips/developer-workshop",
      },
      {
        workspaceId: workspace.id,
        createdById: manager.id,
        title: "Partner Training External Recording",
        description: "Externally hosted recording waiting to be attached to the partner training event.",
        assetType: "VIDEO",
        source: "EXTERNAL_LINK",
        status: "READY",
        durationSeconds: 5100,
        sizeBytes: 0,
        thumbnailUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72",
        playbackUrl: "https://example.com/external/partner-training",
      },
    ],
  });

  await prisma.audienceGroup.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: "Enterprise Customers",
        description: "Customer contacts from enterprise accounts.",
      },
      {
        workspaceId: workspace.id,
        name: "Internal Staff",
        description: "Employees and internal stakeholders.",
      },
      {
        workspaceId: workspace.id,
        name: "Implementation Partners",
        description: "Partner consultants and technical delivery teams.",
      },
      {
        workspaceId: workspace.id,
        name: "Developer Community",
        description: "Developers and technical platform users.",
      },
    ],
  });

  await prisma.accessRule.createMany({
    data: [
      {
        eventId: launchEvent.id,
        type: "EMAIL_DOMAIN_RESTRICTED",
        domainWhitelist: ["customer.com", "partner.com"],
        requiresApproval: true,
      },
      {
        eventId: onboardingEvent.id,
        type: "INVITE_ONLY",
        domainWhitelist: [],
        requiresApproval: false,
      },
      {
        eventId: townHallEvent.id,
        type: "EMAIL_DOMAIN_RESTRICTED",
        domainWhitelist: ["opspilot.dev"],
        requiresApproval: false,
      },
      {
        eventId: securityEvent.id,
        type: "PRIVATE",
        domainWhitelist: ["enterprise.com"],
        requiresApproval: true,
      },
      {
        eventId: workshopEvent.id,
        type: "PUBLIC",
        domainWhitelist: [],
        requiresApproval: false,
      },
    ],
  });

  const registrationDomains = ["customer.com", "partner.com", "enterprise.com", "opspilot.dev", "example.com"];

  for (const event of events) {
    const count = event.status === "DRAFT" ? 8 : event.status === "COMPLETED" ? 24 : 16;

    for (let index = 0; index < count; index++) {
      const domain = registrationDomains[index % registrationDomains.length];

      await prisma.registration.create({
        data: {
          eventId: event.id,
          name: `Attendee ${index + 1}`,
          email: `attendee${index + 1}.${event.id.slice(0, 5)}@${domain}`,
          status: index % 4 === 0 ? "ATTENDED" : "APPROVED",
          source: index % 2 === 0 ? "Landing page" : "Partner invite",
        },
      });
    }
  }

  await prisma.contentModule.createMany({
    data: [
      {
        eventId: launchEvent.id,
        type: "AGENDA",
        title: "Launch Agenda",
        content: "Product keynote, customer story and live Q&A.",
        metadata: {
          startTime: "10:00",
          endTime: "10:45",
          speaker: "Jane Smith",
        },
        order: 1,
      },
      {
        eventId: launchEvent.id,
        type: "SPEAKER",
        title: "Jane Smith",
        content: "VP of Product",
        metadata: {
          name: "Jane Smith",
          role: "VP of Product",
          avatarUrl: "",
          bio: "Leads product strategy for enterprise event operations.",
        },
        order: 2,
      },
      {
        eventId: onboardingEvent.id,
        type: "RESOURCE_LINK",
        title: "Onboarding Workbook",
        content: "Download the onboarding workbook.",
        metadata: {
          url: "https://example.com/onboarding.pdf",
          label: "Download workbook",
        },
        order: 1,
      },
      {
        eventId: townHallEvent.id,
        type: "ANNOUNCEMENT",
        title: "Submit questions before the session",
        content: "Questions submitted before 9 AM will be prioritised.",
        metadata: {},
        order: 1,
      },
      {
        eventId: securityEvent.id,
        type: "SPEAKER",
        title: "Security Leadership Panel",
        content: "Security, compliance and architecture leaders.",
        metadata: {
          name: "Security Panel",
          role: "Compliance and Platform Security",
          avatarUrl: "",
          bio: "Panel discussion on enterprise security readiness.",
        },
        order: 1,
      },
      {
        eventId: workshopEvent.id,
        type: "AGENDA",
        title: "Developer Workshop Agenda",
        content: "API overview, live build and implementation patterns.",
        metadata: {
          startTime: "13:00",
          endTime: "15:30",
          speaker: "Developer Relations Team",
        },
        order: 1,
      },
    ],
  });

  for (const event of events) {
    const baseRegistrations = event.status === "DRAFT" ? 8 : event.status === "COMPLETED" ? 24 : 16;

    for (let day = 6; day >= 0; day--) {
      await prisma.analyticsSnapshot.create({
        data: {
          eventId: event.id,
          date: addDays(now, -day),
          registrations: baseRegistrations + (6 - day) * 3,
          attendees: event.status === "COMPLETED" ? Math.max(8, baseRegistrations - 4 + (6 - day)) : Math.max(0, Math.floor(baseRegistrations * 0.45)),
          averageWatchTime: event.status === "COMPLETED" ? 42 + (6 - day) : 18 + (6 - day),
          engagementScore: event.status === "COMPLETED" ? 68 + (6 - day) : 42 + (6 - day),
          pollParticipationRate: event.status === "COMPLETED" ? 55 + (6 - day) : 20 + (6 - day),
          qaCount: 4 + (6 - day),
          feedbackScore: event.status === "COMPLETED" ? 82 : 0,
        },
      });
    }
  }

  await prisma.recommendation.createMany({
    data: [
      {
        eventId: partnerEvent.id,
        type: "READINESS_RISK",
        severity: "HIGH",
        title: "No audience access rule configured",
        description: "This event does not yet define who can register or access the session.",
        suggestedAction: "Configure an access rule before promoting the event.",
      },
      {
        eventId: partnerEvent.id,
        type: "CONTENT_QUALITY",
        severity: "MEDIUM",
        title: "No content modules configured",
        description: "The event page has no agenda, speaker or resource modules.",
        suggestedAction: "Add at least one agenda or speaker module.",
      },
      {
        eventId: aiRoadmapEvent.id,
        type: "AUDIENCE_GROWTH",
        severity: "HIGH",
        title: "Registration is below target",
        description: "The event starts soon and registrations are below 50% of the target.",
        suggestedAction: "Promote the event to the target audience and review invite coverage.",
      },
      {
        eventId: securityEvent.id,
        type: "POST_EVENT_IMPROVEMENT",
        severity: "MEDIUM",
        title: "Post-event follow-up required",
        description: "The event is completed and should have a follow-up summary or replay plan.",
        suggestedAction: "Publish a replay section or send a post-event summary.",
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        actorUserId: admin.id,
        action: "WORKSPACE_CREATED",
        entityType: "Workspace",
        entityId: workspace.id,
        metadata: { name: workspace.name },
      },
      {
        workspaceId: workspace.id,
        actorUserId: manager.id,
        action: "EVENT_CREATED",
        entityType: "Event",
        entityId: launchEvent.id,
        metadata: { title: launchEvent.title },
      },
      {
        workspaceId: workspace.id,
        actorUserId: manager.id,
        action: "ACCESS_RULE_CREATED",
        entityType: "AccessRule",
        entityId: launchEvent.id,
        metadata: { eventTitle: launchEvent.title },
      },
      {
        workspaceId: workspace.id,
        actorUserId: manager.id,
        action: "CONTENT_MODULE_CREATED",
        entityType: "ContentModule",
        entityId: launchEvent.id,
        metadata: { eventTitle: launchEvent.title },
      },
      {
        workspaceId: workspace.id,
        actorUserId: null,
        action: "RECOMMENDATION_GENERATED",
        entityType: "Recommendation",
        entityId: partnerEvent.id,
        metadata: { eventTitle: partnerEvent.title, severity: "HIGH" },
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo accounts:");
  console.table([
    { role: "Admin", email: "admin@opspilot.dev", password },
    { role: "Event Manager", email: "manager@opspilot.dev", password },
    { role: "Analyst", email: "analyst@opspilot.dev", password },
    { role: "Viewer", email: "viewer@opspilot.dev", password },
  ]);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

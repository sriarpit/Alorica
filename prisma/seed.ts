import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  "Governance Manager",
  "Business Manager",
  "IT Manager",
  "IT Leadership",
  "IT User",
  "Facilities Manager",
  "Facilities Leadership",
  "Facilities User",
  "Security Manager",
  "Security Leadership",
  "Finance Lead",
  "RC Finance Approver",
  "VP Finance Approver",
  "EC Approver",
  "Strategic Sourcing Manager",
  "Strategic Sourcing Team",
  "Admin",
];

const CAPEX_CLASSIFICATIONS = [
  "Growth", "Maintenance", "Technology", "Relocation", "NewLogo", "NewLOB",
  "RampExistingLOB", "SeasonalRamp", "SiteBuildExpansion", "ClientRetention",
  "Internal", "Operations", "Others",
];

const CAPEX_SUB_CLASSIFICATIONS = [
  "Growthsub", "CapitalLabor", "Compliance", "CriticalEquipment", "Infrastructure",
  "LHI", "Maintenancesub", "Miscellaneous", "TechnologySub", "Compliancesub", "Relocationsub",
];

const PROJECT_TYPES = [
  "NewLogo", "Expansion", "Refresh", "Relocation", "Compliance", "Technology",
];

const MILESTONE_ACTIVITIES = [
  // Phase 2 — Planning & Approval
  { label: "Sourcing Kickoff", order: 1, phaseNumber: 2, phaseName: "PlanningApproval", sla: 3, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "CapEx Form Initiated", order: 2, phaseNumber: 2, phaseName: "PlanningApproval", sla: 5, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "IT CapEx Approved", order: 3, phaseNumber: 2, phaseName: "PlanningApproval", sla: 7, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Facilities CapEx Approved", order: 4, phaseNumber: 2, phaseName: "PlanningApproval", sla: 7, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Finance Review Completed", order: 5, phaseNumber: 2, phaseName: "PlanningApproval", sla: 10, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Executive Committee Approval", order: 6, phaseNumber: 2, phaseName: "PlanningApproval", sla: 14, sourceSystem: "OutSystems" as const, dayType: "calendardays" as const },
  { label: "CapEx ID Created", order: 7, phaseNumber: 2, phaseName: "PlanningApproval", sla: 3, sourceSystem: "EDL_Oracle" as const, dayType: "businessdays" as const },
  // Phase 3 — Design & Order
  { label: "Facility — Lease Signed", order: 8, phaseNumber: 3, phaseName: "DesignOrder", sla: 30, sourceSystem: "Facilities" as const, dayType: "calendardays" as const },
  { label: "IT Design Completed", order: 9, phaseNumber: 3, phaseName: "DesignOrder", sla: 14, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "IT Orders Placed", order: 10, phaseNumber: 3, phaseName: "DesignOrder", sla: 5, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Facilities Orders Placed", order: 11, phaseNumber: 3, phaseName: "DesignOrder", sla: 5, sourceSystem: "Facilities" as const, dayType: "businessdays" as const },
  { label: "Security Orders Placed", order: 12, phaseNumber: 3, phaseName: "DesignOrder", sla: 5, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  // Phase 4 — Implementation
  { label: "Construction Started", order: 13, phaseNumber: 4, phaseName: "Implementation_BuildOut", sla: 60, sourceSystem: "Facilities" as const, dayType: "calendardays" as const },
  { label: "IT Room Build Completed", order: 14, phaseNumber: 4, phaseName: "Implementation_BuildOut", sla: 14, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "IT Equipment Delivered", order: 15, phaseNumber: 4, phaseName: "Implementation_BuildOut", sla: 7, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Construction Completed", order: 16, phaseNumber: 4, phaseName: "Implementation_BuildOut", sla: 90, sourceSystem: "Facilities" as const, dayType: "calendardays" as const },
  { label: "IT Deployment Completed", order: 17, phaseNumber: 4, phaseName: "Implementation_BuildOut", sla: 10, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  // Phase 5 — Site Ready
  { label: "Facility Work Completed", order: 18, phaseNumber: 5, phaseName: "SiteReady", sla: 5, sourceSystem: "Facilities" as const, dayType: "businessdays" as const },
  { label: "IT Orders Received", order: 19, phaseNumber: 5, phaseName: "SiteReady", sla: 3, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Client IT — PCs Deployed", order: 20, phaseNumber: 5, phaseName: "SiteReady", sla: 5, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "IT Handover To Client PM", order: 21, phaseNumber: 5, phaseName: "SiteReady", sla: 2, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
  { label: "Site Ready Sign-Off", order: 22, phaseNumber: 5, phaseName: "SiteReady", sla: 1, sourceSystem: "OutSystems" as const, dayType: "businessdays" as const },
];

function makeUsername(roleName: string): string {
  return roleName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Roles
  const createdRoles: Record<string, number> = {};
  for (const roleName of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    createdRoles[roleName] = role.id;
  }
  console.log(`✅ ${ROLES.length} roles seeded`);

  // Classifications
  for (const name of CAPEX_CLASSIFICATIONS) {
    await prisma.capexClassification.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of CAPEX_SUB_CLASSIFICATIONS) {
    await prisma.capexSubClassification.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of PROJECT_TYPES) {
    await prisma.projectType.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("✅ Lookup tables seeded");

  // Milestone activities
  for (const ma of MILESTONE_ACTIVITIES) {
    await prisma.milestoneActivity.upsert({
      where: { id: ma.order },
      update: ma,
      create: { id: ma.order, ...ma },
    });
  }
  console.log(`✅ ${MILESTONE_ACTIVITIES.length} milestone activities seeded`);

  // Users — one per role
  const hashedPassword = await bcrypt.hash("Welcome@123", 12);
  const createdUsers: Record<string, string> = {};

  for (const roleName of ROLES) {
    const username = makeUsername(roleName);
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        name: roleName.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") + " User",
        username,
        password: hashedPassword,
        email: `${username}@alorica.com`,
        mobilePhone: "+1-555-000-0000",
        isActive: true,
        userRoles: {
          create: { roleId: createdRoles[roleName] },
        },
      },
    });
    createdUsers[roleName] = user.id;
  }
  console.log(`✅ ${ROLES.length} users seeded`);

  // Projects (8 mock projects, synced from ServiceNow)
  const itManagerId = createdUsers["IT Manager"];
  const facilitiesManagerId = createdUsers["Facilities Manager"];
  const governanceManagerId = createdUsers["Governance Manager"];
  const businessManagerId = createdUsers["Business Manager"];

  const projectsData = [
    {
      prjNumber: "PRJ-2024-001",
      name: "Manila Hub Expansion",
      projectManagerId: itManagerId,
      businessOwnerId: businessManagerId,
      status: "InProgress" as const,
      phase: "Phase2" as const,
      region: "APAC",
      country: "Philippines",
      location: "Manila",
      classification: "Growth",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-09-30"),
      goLiveDate: new Date("2024-10-01"),
      progressPct: 45,
      riskStatus: "At Risk",
    },
    {
      prjNumber: "PRJ-2024-002",
      name: "Bogota Office Build-Out",
      projectManagerId: itManagerId,
      businessOwnerId: governanceManagerId,
      status: "InProgress" as const,
      phase: "Phase3" as const,
      region: "LATAM",
      country: "Colombia",
      location: "Bogota",
      classification: "NewLogo",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-08-31"),
      goLiveDate: new Date("2024-09-15"),
      progressPct: 68,
      riskStatus: "On Time",
    },
    {
      prjNumber: "PRJ-2024-003",
      name: "Cebu IT Refresh",
      projectManagerId: facilitiesManagerId,
      businessOwnerId: businessManagerId,
      status: "Pending" as const,
      phase: "Phase1" as const,
      region: "APAC",
      country: "Philippines",
      location: "Cebu",
      classification: "Technology",
      startDate: new Date("2024-03-10"),
      endDate: new Date("2024-10-31"),
      goLiveDate: new Date("2024-11-01"),
      progressPct: 12,
      riskStatus: "On Time",
    },
    {
      prjNumber: "PRJ-2024-004",
      name: "Guadalajara New Site",
      projectManagerId: itManagerId,
      businessOwnerId: governanceManagerId,
      status: "InProgress" as const,
      phase: "Phase4" as const,
      region: "LATAM",
      country: "Mexico",
      location: "Guadalajara",
      classification: "NewLogo",
      startDate: new Date("2023-11-01"),
      endDate: new Date("2024-07-31"),
      goLiveDate: new Date("2024-08-15"),
      progressPct: 82,
      riskStatus: "Delayed",
    },
    {
      prjNumber: "PRJ-2024-005",
      name: "Dallas Compliance Upgrade",
      projectManagerId: facilitiesManagerId,
      businessOwnerId: businessManagerId,
      status: "Completed" as const,
      phase: "Phase5" as const,
      region: "NA",
      country: "USA",
      location: "Dallas",
      classification: "Maintenance",
      startDate: new Date("2023-09-01"),
      endDate: new Date("2024-03-31"),
      goLiveDate: new Date("2024-04-01"),
      progressPct: 100,
      riskStatus: "On Time",
    },
    {
      prjNumber: "PRJ-2024-006",
      name: "Lipa New Site",
      projectManagerId: itManagerId,
      businessOwnerId: governanceManagerId,
      status: "Pending" as const,
      phase: "Phase1" as const,
      region: "APAC",
      country: "Philippines",
      location: "Lipa",
      classification: "SiteBuildExpansion",
      startDate: new Date("2024-05-01"),
      endDate: new Date("2024-12-31"),
      goLiveDate: new Date("2025-01-15"),
      progressPct: 5,
      riskStatus: "On Time",
    },
    {
      prjNumber: "PRJ-2024-007",
      name: "Kuala Lumpur Expansion",
      projectManagerId: facilitiesManagerId,
      businessOwnerId: businessManagerId,
      status: "InProgress" as const,
      phase: "Phase2" as const,
      region: "APAC",
      country: "Malaysia",
      location: "Kuala Lumpur",
      classification: "Growth",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-11-30"),
      goLiveDate: new Date("2024-12-01"),
      progressPct: 35,
      riskStatus: "At Risk",
    },
    {
      prjNumber: "PRJ-2024-008",
      name: "Tucson Relocation",
      projectManagerId: itManagerId,
      businessOwnerId: governanceManagerId,
      status: "InProgress" as const,
      phase: "Phase3" as const,
      region: "NA",
      country: "USA",
      location: "Tucson",
      classification: "Relocation",
      startDate: new Date("2024-02-15"),
      endDate: new Date("2024-09-15"),
      goLiveDate: new Date("2024-10-01"),
      progressPct: 55,
      riskStatus: "On Time",
    },
  ];

  for (const projectData of projectsData) {
    await prisma.project.upsert({
      where: { prjNumber: projectData.prjNumber },
      update: {},
      create: projectData,
    });
  }
  console.log(`✅ ${projectsData.length} projects seeded`);

  // Locations
  const locations = [
    { regions: "APAC", countries: "Philippines", locations: "Manila", locationCode: "MNL" },
    { regions: "APAC", countries: "Philippines", locations: "Cebu", locationCode: "CEB" },
    { regions: "APAC", countries: "Philippines", locations: "Lipa", locationCode: "LPA" },
    { regions: "APAC", countries: "Malaysia", locations: "Kuala Lumpur", locationCode: "KUL" },
    { regions: "LATAM", countries: "Colombia", locations: "Bogota", locationCode: "BOG" },
    { regions: "LATAM", countries: "Mexico", locations: "Guadalajara", locationCode: "GDL" },
    { regions: "NA", countries: "USA", locations: "Dallas", locationCode: "DAL" },
    { regions: "NA", countries: "USA", locations: "Tucson", locationCode: "TUS" },
  ];
  for (const loc of locations) {
    await prisma.location.create({ data: loc });
  }
  console.log("✅ Locations seeded");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Test credentials:");
  console.log("  Username: governance.manager  Password: Welcome@123  Role: Governance Manager");
  console.log("  Username: it.manager          Password: Welcome@123  Role: IT Manager");
  console.log("  Username: finance.lead        Password: Welcome@123  Role: Finance Lead");
  console.log("  Username: admin               Password: Welcome@123  Role: Admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

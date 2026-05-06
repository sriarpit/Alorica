export interface ServiceNowProject {
  prjNumber: string;
  name: string;
  projectManagerEmail: string;
  businessOwnerEmail: string;
  status: string;
  phase: string;
  region: string;
  country: string;
  location: string;
  classification: string;
  startDate: string;
  endDate: string;
  goLiveDate: string;
  progressPct: number;
  riskStatus: string;
}

export const mockServiceNowProjects: ServiceNowProject[] = [
  {
    prjNumber: "PRJ-2024-001",
    name: "Manila Hub Expansion",
    projectManagerEmail: "it.manager@alorica.com",
    businessOwnerEmail: "business.manager@alorica.com",
    status: "InProgress",
    phase: "Phase2",
    region: "APAC",
    country: "Philippines",
    location: "Manila",
    classification: "Growth",
    startDate: "2024-01-15",
    endDate: "2024-09-30",
    goLiveDate: "2024-10-01",
    progressPct: 45,
    riskStatus: "At Risk",
  },
  {
    prjNumber: "PRJ-2024-002",
    name: "Bogota Office Build-Out",
    projectManagerEmail: "it.manager@alorica.com",
    businessOwnerEmail: "governance.manager@alorica.com",
    status: "InProgress",
    phase: "Phase3",
    region: "LATAM",
    country: "Colombia",
    location: "Bogota",
    classification: "NewLogo",
    startDate: "2024-02-01",
    endDate: "2024-08-31",
    goLiveDate: "2024-09-15",
    progressPct: 68,
    riskStatus: "On Time",
  },
  {
    prjNumber: "PRJ-2024-003",
    name: "Cebu IT Refresh",
    projectManagerEmail: "facilities.manager@alorica.com",
    businessOwnerEmail: "business.manager@alorica.com",
    status: "Pending",
    phase: "Phase1",
    region: "APAC",
    country: "Philippines",
    location: "Cebu",
    classification: "Technology",
    startDate: "2024-03-10",
    endDate: "2024-10-31",
    goLiveDate: "2024-11-01",
    progressPct: 12,
    riskStatus: "On Time",
  },
  {
    prjNumber: "PRJ-2024-004",
    name: "Guadalajara New Site",
    projectManagerEmail: "it.manager@alorica.com",
    businessOwnerEmail: "governance.manager@alorica.com",
    status: "InProgress",
    phase: "Phase4",
    region: "LATAM",
    country: "Mexico",
    location: "Guadalajara",
    classification: "NewLogo",
    startDate: "2023-11-01",
    endDate: "2024-07-31",
    goLiveDate: "2024-08-15",
    progressPct: 82,
    riskStatus: "Delayed",
  },
  {
    prjNumber: "PRJ-2024-005",
    name: "Dallas Compliance Upgrade",
    projectManagerEmail: "facilities.manager@alorica.com",
    businessOwnerEmail: "business.manager@alorica.com",
    status: "Completed",
    phase: "Phase5",
    region: "NA",
    country: "USA",
    location: "Dallas",
    classification: "Maintenance",
    startDate: "2023-09-01",
    endDate: "2024-03-31",
    goLiveDate: "2024-04-01",
    progressPct: 100,
    riskStatus: "On Time",
  },
  {
    prjNumber: "PRJ-2024-006",
    name: "Lipa New Site",
    projectManagerEmail: "it.manager@alorica.com",
    businessOwnerEmail: "governance.manager@alorica.com",
    status: "Pending",
    phase: "Phase1",
    region: "APAC",
    country: "Philippines",
    location: "Lipa",
    classification: "SiteBuildExpansion",
    startDate: "2024-05-01",
    endDate: "2024-12-31",
    goLiveDate: "2025-01-15",
    progressPct: 5,
    riskStatus: "On Time",
  },
  {
    prjNumber: "PRJ-2024-007",
    name: "Kuala Lumpur Expansion",
    projectManagerEmail: "facilities.manager@alorica.com",
    businessOwnerEmail: "business.manager@alorica.com",
    status: "InProgress",
    phase: "Phase2",
    region: "APAC",
    country: "Malaysia",
    location: "Kuala Lumpur",
    classification: "Growth",
    startDate: "2024-01-01",
    endDate: "2024-11-30",
    goLiveDate: "2024-12-01",
    progressPct: 35,
    riskStatus: "At Risk",
  },
  {
    prjNumber: "PRJ-2024-008",
    name: "Tucson Relocation",
    projectManagerEmail: "it.manager@alorica.com",
    businessOwnerEmail: "governance.manager@alorica.com",
    status: "InProgress",
    phase: "Phase3",
    region: "NA",
    country: "USA",
    location: "Tucson",
    classification: "Relocation",
    startDate: "2024-02-15",
    endDate: "2024-09-15",
    goLiveDate: "2024-10-01",
    progressPct: 55,
    riskStatus: "On Time",
  },
];

export function getServiceNowProjects(): ServiceNowProject[] {
  return mockServiceNowProjects;
}

export function getServiceNowProjectByNumber(prjNumber: string): ServiceNowProject | undefined {
  return mockServiceNowProjects.find((p) => p.prjNumber === prjNumber);
}

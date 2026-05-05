# Alorica Site Build — Claude Project Context

## Project Overview

Rebuilding Alorica's OutSystems Site Build application from scratch using Next.js 14 + PostgreSQL.
The app manages CapEx (Capital Expenditure) approval workflows and milestone tracking for Alorica site build projects.

**Source of truth:** `d:\Alorica\Requirement Documents\UserGuid_SiteBuild_Outsystems.pdf`
**Current OutSystems app (reference only):** `https://alorica-dev.outsystemsenterprise.com/SiteBuild/login`
**Plan file:** `C:\Users\Arpita1\.claude\plans\hi-claude-i-have-linear-glade.md`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 with Azure AD provider |
| Email | Nodemailer (SMTP via Office365) |
| File Storage | Local disk (`/public/uploads`) |
| SLA Cron | node-cron (daily SLA reminder check) |
| ServiceNow | Mock data layer (swappable for real API) |
| EDL Oracle | Mock CapEx ID generator (`Proj-CapExId_XXXX` format) |

---

## Key Architectural Decisions

- **Mock ServiceNow**: Projects originate from ServiceNow in production; we mock this data in dev
- **Azure SSO**: Auth via NextAuth.js + Azure AD (Alorica Azure Directory Group). `User.externalId` stores Azure AD Object ID
- **Local file storage**: Attachments saved to `/public/uploads/[capExRequestId]/[sectionId]/[filename]`
- **No real EDL API**: CapEx ID generated locally as `Proj-CapExId_XXXX` (mock)
- **EC public page**: `/ec/[token]` requires no auth — EC members approve/reject via emailed deep-link
- **CapEx global lock**: After any approver (RC Finance, VP Finance, or EC) submits → entire CapEx form locked except Comments + Document Summary fields
- **EC budget threshold**: Executive Committee section only appears when Grand Total > $25,000

---

## Project Structure

```
d:\Alorica\
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (main)/                          ← protected, wraps sidebar + topbar
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx           ← Executive Dashboard (Kanban)
│   │   ├── milestone-tracking/
│   │   │   ├── page.tsx                 ← empty state
│   │   │   └── [projectId]/page.tsx     ← READ-ONLY visual timeline
│   │   ├── projects/
│   │   │   ├── page.tsx                 ← Project Requests table
│   │   │   └── [prjId]/
│   │   │       ├── milestones/          ← EDITABLE milestone forms
│   │   │       │   ├── layout.tsx       ← phase sub-nav
│   │   │       │   ├── page.tsx         ← redirects to phase-2
│   │   │       │   ├── phase-2/page.tsx
│   │   │       │   ├── phase-3/page.tsx
│   │   │       │   ├── phase-4/page.tsx
│   │   │       │   └── phase-5/page.tsx
│   │   │       └── capex/
│   │   │           ├── layout.tsx       ← CapEx sub-nav sidebar
│   │   │           ├── request-details/page.tsx
│   │   │           ├── types-bpm/page.tsx
│   │   │           ├── functional/
│   │   │           │   ├── it/page.tsx
│   │   │           │   ├── facilities/page.tsx
│   │   │           │   └── security/page.tsx
│   │   │           ├── total/page.tsx
│   │   │           ├── finance-review/page.tsx
│   │   │           └── amendments/page.tsx
│   │   └── admin/users/page.tsx
│   ├── ec/[token]/page.tsx              ← PUBLIC (no auth)
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── projects/route.ts
│       ├── projects/[prjId]/capex/route.ts
│       ├── milestones/route.ts
│       ├── users/route.ts
│       ├── uploads/route.ts
│       └── cron/sla-check/route.ts
├── components/
│   ├── ui/                              ← shadcn/ui primitives
│   ├── layout/                          ← Sidebar.tsx, TopBar.tsx
│   ├── dashboard/                       ← ProjectCard, PhaseColumn, FilterBar
│   ├── milestone-tracking/              ← TimelineBar, PhaseProgressBar, MilestoneReadRow
│   ├── capex/                           ← form sections, approval tables
│   ├── milestones/                      ← MilestoneFormRow, PhaseAccordion
│   └── admin/                           ← UserTable, RoleManager
├── lib/
│   ├── prisma.ts                        ← Prisma client singleton
│   ├── auth.ts                          ← NextAuth config
│   ├── email/
│   │   ├── mailer.ts                    ← Nodemailer transport
│   │   └── templates/                   ← one TS file per email event
│   ├── servicenow/mock.ts               ← mock project data
│   └── edl-api/mock.ts                  ← mock CapEx ID generation
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/                               ← shared TypeScript types
├── public/uploads/                      ← local file storage
├── .env.local
├── CLAUDE.md                            ← this file
├── next.config.ts
└── tailwind.config.ts
```

---

## Sidebar Navigation — 3 Context States (CRITICAL)

### State 1 — Default (no project selected)
```
Dashboard ∧
  Executive              → /dashboard
  Milestone Tracking     → /milestone-tracking
Project Requests         → /projects
[username + role — bottom]
```

### State 2 — Inside a specific project (from Project Requests)
```
Dashboard ∧
  Executive
  Milestone Tracking
Project Requests
Project Management (PRJ-XXXX) ∧      ← dynamic project label
  CapEx Form ∧
    Request Details                   → /projects/[id]/capex/request-details
    CapEx Types & BPM                 → /projects/[id]/capex/types-bpm
    Functional Organization ∧
      IT                              → /projects/[id]/capex/functional/it
      Facilities                      → /projects/[id]/capex/functional/facilities
      Security                        → /projects/[id]/capex/functional/security
      Total                           → /projects/[id]/capex/total
    Finance Review/Approvals          → /projects/[id]/capex/finance-review
    Amendments                        → /projects/[id]/capex/amendments
  Milestone ∧
    Phase 2 | Planning & Approval     → /projects/[id]/milestones/phase-2
    Phase 3 | Design & Order          → /projects/[id]/milestones/phase-3
    Phase 4 | Implementation/Build... → /projects/[id]/milestones/phase-4
    Phase 5 | SiteReady               → /projects/[id]/milestones/phase-5
[username + role — bottom]
```

### State 3 — Milestone Tracking view (from Executive Dashboard click)
```
Dashboard ∧
  Executive
  Milestone Tracking     ← ACTIVE
Project Requests
[username + role — bottom]
```

---

## Database Schema (PostgreSQL via Prisma)

### Core Tables

**users** — id, name, username, password, email, mobilePhone, externalId (Azure AD OID), creationDate, lastLogin, isActive

**roles** — id, name (17 role types)

**user_roles** — userId, roleId (M:M junction)

**projects** — id, prjNumber (unique, from ServiceNow), name, projectManagerId, businessOwnerId, status, phase, region, country, location, classification, startDate, endDate, goLiveDate, progressPct, riskStatus, createdAt

**capex_requests** — id, guid (uuid), businessSponsorId, businessRequesterId, projectManagerId, requestDate, projectName, serviceNowProjectNo, region, country, specification, projectDescription, businessJustification, isClientMandated, clientNameFromDropdown, clientName, isFunded, isClientContractualObligation, clientMandatedComments, isNewlogoGrowth, newlogoGrowth, isNewlogoNotListed, capexClassificationId, capexSubClassificationId, projectTypeId, scope, goLiveOnDate, projectTakeDate, trackingCategory, comments, state, createdBy, createdOn, updatedBy, updatedOn, googlemapsLocationlink, requestStatus, finalStatusDate, tempBusinessSponsorEmail, tempBusinessRequesterEmail, tempProjectManagerEmail, isActive

**capex_request_business_pm** — capExRequestId (PK/FK), isIt, isFacilities, isPhysicalSecurity, itPmId, facilitiesPmId, facilitiesPmCreateDate, physicalSecurityPmId, itPmCreateDate, physicalSecurityPmCreateDate, isRoiRequired, roiComment, status, financeAssignDate, financeTeamId, createdOn, updatedOn

**capex_section_details** — ONE table for IT + Facilities + Security (all fields combined):
- IT: infrastructureCostTotal, eusCostTotal, capitalLaborCostTotal, infrastructureCostSeats, eusCostSeats, capitalLaborCostSeats, isExistingInventoryEvaluatedIT, isCompetitiveBidIT, infrastructureLeadApproverId, infrastructureLeadStatus, infrastructureLeadApprovedById, infrastructureLeadApprovedDate, eusLeadApproverId, eusApprovedById, eusStatus, eusApprovedDate, capitalLaborLeadApproverId, capitalLaborLeadStatus, capitalLaborApprovedById, capitalLaborApprovedDate, itComments, itSessionStatus, itCreatedOn, itUpdatedBy, itUpdatedOn, itSessionCreatedBy
- Facilities: construction, electricalCabling, furnitureFixture, others, constructionSeats, electricalCablingSeats, furnitureFixtureSeats, othersSeats, tenantImprovementAllowance, isExistingInventoryEvaluatedFac, isCompetitiveBidFac, facilitiesLeadApproverId, facilitiesStatus, facilitiesApprovedDate, facilitiesSessionStatus, facilitiesCreatedOn, facilitiesUpdatedOn, facilitiesSessionCreatedBy
- Lease Info (part of Facilities): leaseRegion, leaseLocation, leaseDetails, leaseTerms, leaseTermsConditions, totalLeaseValue, currentYearOpexImpact
- Security: securityTotal, securitySeats, isExistingInventoryEvaluatedSec, isCompetitiveBidSec, securityLeadApproverId, securityLeadApprovedById, securityLeadApproveStatus, securityApprovedDate, securitySessionStatus, securityCreatedBy, securityCreatedOn, securityUpdatedBy, securityUpdatedOn
- Shared: isSendFinanceEmail, hCreatedBy, hCreatedOn, hUpdatedBy, hUpdatedOn

**capex_finance_approval** — ONE table for RC Finance + VP Finance + CapEx ID:
capExRequestId (PK/FK), isBudget, explanation, regCorpFinanceApproverId, regCorpApproverDate, regionalApprovalStatusId, regCorpApproveById, vpFinanceApproverId, vpFinanceApprovalStatusId, vpApprovedDate, vpFinanceReviewedById, vpApprovedById, projectCapex (generated ID string), projectStatus, projectStatusDate, projectStatusModifyDate, projectStatusTxt, isCapExIdManuallyCreated, statusSA, statusRC, statusIF, statusVP, createdBy, createdOn, updatedBy, updatedOn

**executive_committee_members** — id, capExRequestId (FK), userId, status, lastModifyDate, comments, token (unique — for email deep-link)

**amendments** — id, capExRequestId (FK), amendment, amendmentAmount, amendmentDate, note, projectStatusDate, leadApproverId, leadApproveById, leadApproveDate, approvalStatusId, approverType, status, createdBy, createdOn, updatedBy, updatedOn

**related_capex** — id, capExRequestId (FK), capExNo, description, createdBy, systemCreatedBy, createdDate, updatedBy, updatedOn

**capex_attachments** — id, capExRequestId (FK), fileContent (file path on disk), fileName, sectionId (enum), secondaryId

**comments** — id, capExRequestId (FK), comments, createdById, createdOn, commentsType (enum), categoryType (enum), secondaryId, summaryComments

**milestone_activities_tracking** — id, capExRequestId (FK), milestoneActivitiesId (FK), startDate, endDate, remarks, status, assignedTo, dueDate, spent, completedDate, plannedEndDate, isActive, updateTime, updatedById

**location** — id, regions, countries, locations, locationCode, isActive, createdDateTime, updatedDateTime

**client_names** — id, clientName, createdDateTime

**api_log** — id, timestamp, actionType, method, statusCode, requestPayload, responsePayload, errorDetails, isIncoming, moduleName

**activity_log** — id, timerLog, userId, actionType, capExRequestId (FK), activityLogMessage

**generic_files** — id, fileContent (file path), fileName

---

## Static Entities (OutSystems → PostgreSQL Lookup/Enum Tables)

### CapEx Classification
Values: Growth, Maintenance, Technology, Relocation, NewLogo, NewLOB, RampExistingLOB, SeasonalRamp, SiteBuildExpansion, ClientRetention, Internal, Operations, Others

### CapEx Sub-Classification
Values: Growthsub, CapitalLabor, Compliance, CriticalEquipment, Infrastructure, LHI, Maintenancesub, Miscellaneous, TechnologySub, Compliancesub, Relocationsub

### Status (multi-purpose)
Values: Approved, Rejected, InProgress, Completed, ApprovedbyLeadership, Draft, Submitted, Active, Unapproved, Closed, Pending, WorkinProgress

### SectionId / CategoryType (for comments and attachments)
Values: RequestorSection, BusinessPMSection, ITPMSection, FacilitiesPMSection, SecurityPMSection, ApprovalProjectStatusSection, IT, Facilities, Security

### FileUploadType (for capex_attachments.sectionId)
Values: ClientFundedFileUpload, ClientContractualObligationFileUpload, ROIRequiredFileUpload, ITFileUpload, FacilitiesFileUpload, SecurityFileUpload, FinanceReviewFileUpload, BusinessPMFileUpload, MilestoneActivitesFileupload, AmendmentToAssignPerson, ExecutiveCommitteeFileUpload, MilestoneActivitesImageFileUpload, AttachFilesClientFunded, AttachFilesClientContractualObligation, AttachFilesROIRequired, AttachFilesIT, AttachFilesFacilities, AttachFilesSecurity

### EmailType (for email_log / templates)
Values: NewCapExToRequestorEmail, RequestorToBusinessPMEmail, BusinessToLeadApproverEmail, LeadApproverToFunctionalOrganizationLeadEmail, FunctionalOrganizationLeadToFinanceTeamEmail, FinanceTeamToFinanceApproverEmail, Milestone, MilestoneActivitiesAssignToEmail, MilestoneActivitiesAssignPendingEmail, FollowUp, ExecutivecommitteeEmail, CapExIdConfriomationEmail, RCFinanceApprover, VPFinanceApprover, FinanceReview, ECReview, CapExIdRejectionEmail, NewUserCreated, NewRoleCreated, StrategicSourcingManager

### Finance Comment Types (commentsType)
Values: Regional_CorporateFinanceComments, VPFinanceComments, ExecutiveCommittee, Amendments, NormalComment, SummaryComments

### SystemTrackStatus (milestone system tracking)
Values: Pending, WorkinProgress, Projectcreation, Aftersourcingkickoff, CAPEXforminitiated, CAPEXformcreation, AfterIT_Facility_Securityapprovals, AfterFinanceapproval, AfterECapproval, AfterCAPEXIDcreation, CAPEXIDcreated, Ordersplaced, Constructionstarted, AfterITRoombuildcompleted, Constructioncompleted, CapExROMApproved, CapExBusinessCaseApproval, FacilityOrders, ITOrdersInitiation, Facilityworkcompleted, ITordersreceived, businessdays, calendardays, Manual, Spent, Document, ITHandovertoClientPM, ClientIT_PCsDeployed, ITDeploymentCompleted, Completed, ProjectCreated

### MilestoneActivities Static Entity Fields
Id, Label, Order, Is_Active, PhaseNumber, PhaseName, SLA, SourceSystem, Trigger_Condition, Group, DayType, TypeOfFieldDis, SLACaluationdateActivites, FollowUpEmailGroup, RoleType

### Phase Enum Types
Phase1, Phase2, Phase3, Phase4, Phase5
Initiation, PlanningApproval, DesignOrder, Implementation_BuildOut, SiteReady

### Source System Types
ServiceNow, OutSystems, Facilities, StrategicSourcing, EDL_Oracle

---

## 17 Roles

1. Governance Manager
2. Business Manager
3. IT Manager
4. IT Leadership
5. IT User
6. Facilities Manager
7. Facilities Leadership
8. Facilities User
9. Security Manager
10. Security Leadership
11. Finance Lead
12. RC Finance Approver
13. VP Finance Approver
14. EC Approver
15. Strategic Sourcing Manager
16. Strategic Sourcing Team
17. Admin

---

## Role-Based Access Matrix

| Role | Milestone | CapEx Form | IT | Facilities | Security | Finance | Amendments |
|---|---|---|---|---|---|---|---|
| Governance Manager | view/edit | view/edit | view/edit | view/edit | view/edit | view/edit | view/edit |
| Business Manager | view/edit | view/edit | view/edit | view/edit | view/edit | view/edit | view/edit |
| IT Manager | view/edit | view | view/edit | view | view | view | view |
| IT Leadership | view | view | view/edit | view | view | view | view |
| IT User | assign only | hidden | hidden | hidden | hidden | hidden | hidden |
| Facilities Manager | view/edit | view | view | view/edit | view | view | view |
| Facilities Leadership | view | view | view | view/edit | view | view | view |
| Facilities User | assign only | hidden | hidden | hidden | hidden | hidden | hidden |
| Security Manager | view | view | view | view | view/edit | view | view |
| Security Leadership | view | view | view | view | view/edit | view | view |
| Finance Lead | view | view | view | view | view | view/edit | view/edit |
| RC Finance Approver | view | view | view | view | view | view/edit | view |
| VP Finance Approver | view | view | view | view | view | view/edit | view |
| EC Approver | view | view | view | view | view | view/edit | view |
| Strategic Sourcing Mgr | view/edit | view | view | view | view | view | view |
| Strategic Sourcing Team | view/edit | view | view | view | view | view | view |

---

## Email Notifications

| Event | Recipients |
|---|---|
| Project Created (ServiceNow) | Business Owner/Requestor + CC Business PM |
| CapEx Form Initiated | Business PM |
| Functional Assignment | IT Manager / Facilities Manager / Security Manager |
| Leadership Approval Needed | IT/Facilities/Security Leadership (ALL users with that role) |
| Finance Notification | Finance CapEx Team (group email) |
| RC Finance Assigned | RC Finance Approver |
| VP Finance Assigned | VP Finance Approver |
| EC Assigned | EC member — with Approve/Reject buttons deep-linking to `/ec/[token]` |
| EC All Approved | Project Manager |
| CapEx ID Generated | Project Manager + Facilities Manager + IT Manager |
| Milestone Assigned | Assigned User |
| SLA Reminder (cron) | Assigned User for overdue milestones |
| New User Created | New user |
| New Role Created | Admin notification |
| Strategic Sourcing Manager | Strategic Sourcing Manager |

---

## UI Design System

- **Sidebar**: Dark navy `#0f1e35`, Alorica logo top-left, collapsible sections, user + role bottom-left with logout
- **Status badges**:
  - `In Progress` → blue pill
  - `Completed` → dark pill
  - `Delayed` → red pill
  - `On Time` → green pill
  - `At Risk` → orange pill
- **Dashboard**: 5 Kanban columns: Initiation | Planning & Approval | Design & Order | Implementation | Site Ready
- **Project cards**: White card — project name, owner, date range, status badge, risk badge, progress bar
- **Forms**: Auto-populated read-only header (Project No, Manager Name, Project Name, Go Live Date) + form fields below
- **Tables**: Striped rows, action buttons in first column
- **Approval tables**: Approver name, status dropdown, approved-by (auto-filled), date columns

---

## Milestone Tracking Visual Timeline (8 checkpoints)

1. Project Created
2. CapEx Business Case Approval
3. CAPEX ID Created
4. Facility Work Completed
5. IT Orders Received
6. IT Deployment Completed
7. Client IT — PCs Deployed
8. IT Handover To Client PM

Each checkpoint shows its date; completed ones filled green.

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/alorica_sitebuild"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
AZURE_AD_CLIENT_ID="..."
AZURE_AD_CLIENT_SECRET="..."
AZURE_AD_TENANT_ID="..."
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="noreply@alorica.com"
```

---

## Build Phases

1. **Foundation** — Next.js scaffold, Prisma schema + migrations, seed data, NextAuth, base layout
2. **Dashboard** — Kanban columns, ProjectCard, FilterBar, `/api/projects`
3. **Project Requests** — Table list, role-filtered, "Assigned to me" toggle, pagination
4. **CapEx Form** — All 8 sub-sections (Request Details through Amendments), form lock logic
5. **Milestone Views** — Read-only timeline (`/milestone-tracking/[id]`) + editable forms (`/projects/[id]/milestones/*`)
6. **Email System** — Nodemailer transport + all email templates
7. **EC Public Page** — `/ec/[token]` — no auth, Approve/Reject with comment
8. **Admin Panel** — User management, role assignment
9. **SLA Cron + Polish** — node-cron daily check, middleware route guards, empty states, error boundaries

---

## Current Status (as of plan creation)

- Planning complete ✓
- Folder structure created ✓
- CLAUDE.md created ✓
- HTML manager document created (`d:\Alorica\Project_Plan_SiteBuild.html`) ✓
- **Implementation: NOT STARTED — awaiting user approval**

Next step: User approves plan → start Phase 1 (Foundation).

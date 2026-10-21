import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const COMPETITORS = [
  { name: "Shapes", domain: "shapes.co", category: "AI tools / inspiration", priority: "P2", relationship: "inspiration" },
  { name: "Workforce Compass", domain: "workforce-compass.com", category: "AI / workforce tools (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "Warp", domain: "warp.co", category: "Payroll / AI HR automation", priority: "P1", relationship: "adjacent" },
  { name: "Winslow", domain: "usewinslow.com", category: "HRIS / HR operations", priority: "P1", relationship: "competitor" },
  { name: "Humaans", domain: "humaans.io", category: "HRIS", priority: "P1", relationship: "competitor" },
  { name: "Athena", domain: "withathena.ai", category: "AI HR (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "Quinyx", domain: "quinyx.com", category: "Workforce management", priority: "P1", relationship: "competitor" },
  { name: "HQ Coach", domain: "hq.coach", category: "Learning / coaching", priority: "P2", relationship: "adjacent" },
  { name: "LearnUpon", domain: "learnupon.com", category: "LMS / learning", priority: "P1", relationship: "competitor" },
  { name: "Transformify", domain: "transformify.org", category: "Recruiting / workforce", priority: "P2", relationship: "adjacent" },
  { name: "HR Work Cycles", domain: "hrworkcycles.com", category: "I-9 / compliance", priority: "P1", relationship: "competitor" },
  { name: "Launchbay", domain: "launchbay.com", category: "AI / startup tools (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "Employ Inc.", domain: "employinc.com", category: "ATS / recruiting", priority: "P1", relationship: "competitor" },
  { name: "Workforce.com", domain: "workforce.com", category: "Time / scheduling / workforce", priority: "P1", relationship: "competitor" },
  { name: "Workleap", domain: "workleap.com", category: "Employee experience / performance", priority: "P1", relationship: "competitor" },
  { name: "Leapsome", domain: "leapsome.com", category: "Performance / engagement", priority: "P1", relationship: "competitor" },
  { name: "Workvivo", domain: "workvivo.com", category: "Employee communications", priority: "P0", relationship: "competitor" },
  { name: "LumApps", domain: "lumapps.com", category: "Employee communications", priority: "P1", relationship: "competitor" },
  { name: "Staffbase", domain: "staffbase.com", category: "Employee communications / AI knowledge", priority: "P0", relationship: "competitor" },
  { name: "Beekeeper", domain: "beekeeper.io", category: "Frontline communications", priority: "P0", relationship: "competitor" },
  { name: "Connecteam", domain: "connecteam.com", category: "Frontline HR / communication", priority: "P0", relationship: "competitor" },
  { name: "Simpplr", domain: "simpplr.com", category: "Employee communications", priority: "P1", relationship: "competitor" },
  { name: "Haiilo", domain: "haiilo.com", category: "Employee communications", priority: "P1", relationship: "competitor" },
  { name: "Firstup", domain: "firstup.io", category: "Employee communications", priority: "P1", relationship: "competitor" },
  { name: "Dynamic Signal", domain: "dynamicsignal.com", category: "Legacy employee comms brand", priority: "P2", relationship: "historical_alias" },
  { name: "Happeo", domain: "happeo.com", category: "Employee intranet", priority: "P1", relationship: "competitor" },
  { name: "Motivosity", domain: "motivosity.com", category: "Recognition / engagement", priority: "P1", relationship: "competitor" },
  { name: "GoHappy", domain: "gohappyhub.com", category: "Frontline communications", priority: "P1", relationship: "competitor" },
  { name: "Kudos", domain: "kudos.com", category: "Recognition", priority: "P1", relationship: "competitor" },
  { name: "Bonusly", domain: "bonus.ly", category: "Recognition", priority: "P1", relationship: "competitor" },
  { name: "Awardco", domain: "award.co", category: "Recognition", priority: "P1", relationship: "competitor" },
  { name: "Nectar", domain: "nectarhr.com", category: "Recognition", priority: "P1", relationship: "competitor" },
  { name: "Guusto", domain: "guusto.com", category: "Recognition", priority: "P1", relationship: "competitor" },
  { name: "Bucketlist Rewards", domain: "bucketlistrewards.com", category: "Recognition", priority: "P1", relationship: "competitor" },
  { name: "ClearCompany", domain: "clearcompany.com", category: "Onboarding / ATS", priority: "P1", relationship: "competitor" },
  { name: "Click Boarding", domain: "clickboarding.com", category: "Onboarding", priority: "P1", relationship: "competitor" },
  { name: "EMPTrust", domain: "emptrust.com", category: "I-9 / onboarding", priority: "P1", relationship: "competitor" },
  { name: "WorkBright", domain: "workbright.com", category: "Mobile onboarding / I-9", priority: "P0", relationship: "competitor" },
  { name: "Onboarded", domain: "onboarded.com", category: "Onboarding", priority: "P1", relationship: "competitor" },
  { name: "Talmundo", domain: "talmundo.com", category: "Onboarding legacy brand", priority: "P2", relationship: "historical_alias" },
  { name: "Enboarder", domain: "enboarder.com", category: "Onboarding experiences", priority: "P1", relationship: "competitor" },
  { name: "Humand", domain: "humand.co", category: "Frontline workforce communications", priority: "P0", relationship: "competitor" },
  { name: "Rippling", domain: "rippling.com", category: "HRIS / employee lifecycle", priority: "P0", relationship: "competitor" },
  { name: "Deel", domain: "deel.com", category: "HRIS / global workforce", priority: "P0", relationship: "competitor" },
  { name: "BambooHR", domain: "bamboohr.com", category: "HRIS / onboarding", priority: "P0", relationship: "competitor" },
  { name: "Gusto", domain: "gusto.com", category: "HRIS / payroll", priority: "P1", relationship: "competitor" },
  { name: "Zoho People", domain: "zoho.com", category: "HRIS", priority: "P1", relationship: "competitor" },
  { name: "Namely", domain: "namely.com", category: "HRIS", priority: "P1", relationship: "competitor" },
  { name: "HiBob", domain: "hibob.com", category: "HRIS / people management", priority: "P1", relationship: "competitor" },
  { name: "UKG", domain: "ukg.com", category: "HCM / scheduling integration ecosystem", priority: "P0", relationship: "partner_ecosystem" },
  { name: "Personio", domain: "personio.com", category: "HRIS", priority: "P1", relationship: "competitor" },
  { name: "ExtensisHR", domain: "extensishr.com", category: "HR / PEO", priority: "P2", relationship: "adjacent" },
  { name: "APS Payroll", domain: "apspayroll.com", category: "Payroll / HR", priority: "P2", relationship: "adjacent" },
  { name: "Employment Hero", domain: "employmenthero.com", category: "HRIS / AI recruiting", priority: "P0", relationship: "competitor" },
  { name: "Engagedly", domain: "engagedly.com", category: "Performance management", priority: "P1", relationship: "competitor" },
  { name: "Lattice", domain: "lattice.com", category: "Performance management", priority: "P1", relationship: "competitor" },
  { name: "PerformYard", domain: "performyard.com", category: "Performance management", priority: "P1", relationship: "competitor" },
  { name: "15Five", domain: "15five.com", category: "Performance management", priority: "P1", relationship: "competitor" },
  { name: "Sweeq", domain: "sweeq.com", category: "Frontline tools (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "YOOBIC", domain: "yoobic.com", category: "Frontline operations / learning", priority: "P1", relationship: "competitor" },
  { name: "Skedulo", domain: "skedulo.com", category: "Frontline scheduling", priority: "P1", relationship: "competitor" },
  { name: "When I Work", domain: "wheniwork.com", category: "Scheduling / time", priority: "P1", relationship: "competitor" },
  { name: "Harri", domain: "harri.com", category: "Hourly recruiting / HR", priority: "P0", relationship: "competitor" },
  { name: "Workstream", domain: "workstream.us", category: "Hourly recruiting / onboarding", priority: "P0", relationship: "competitor" },
  { name: "Frontline Education", domain: "frontlineeducation.com", category: "K-12 HR / staffing", priority: "P0", relationship: "competitor" },
  { name: "Apploi", domain: "apploi.com", category: "Healthcare recruiting / onboarding", priority: "P0", relationship: "competitor" },
  { name: "ParentPulse", domain: "parentpulse.com", category: "K-12 adjacent (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "FACTS", domain: "factsmgt.com", category: "K-12 education operations", priority: "P2", relationship: "adjacent" },
  { name: "Red Rover", domain: "redroverk12.com", category: "K-12 time / absence", priority: "P1", relationship: "competitor" },
  { name: "Belina Payroll", domain: "belinapayroll.com", category: "Payroll (regional)", priority: "P2", relationship: "adjacent" },
  { name: "PaySpace", domain: "payspace.com", category: "Payroll (regional)", priority: "P2", relationship: "adjacent" },
  { name: "Worksome", domain: "worksome.com", category: "Contingent workforce management", priority: "P2", relationship: "adjacent" },
  { name: "PARiM", domain: "parim.co", category: "Time / workforce scheduling", priority: "P1", relationship: "competitor" },
  { name: "Empeon", domain: "empeon.com", category: "Healthcare workforce / HCM", priority: "P0", relationship: "competitor" },
  { name: "Viventium", domain: "viventium.com", category: "Healthcare payroll / HCM", priority: "P0", relationship: "competitor" },
  { name: "Relias", domain: "relias.com", category: "Healthcare training / compliance", priority: "P0", relationship: "competitor" },
  { name: "CEIPAL", domain: "ceipal.com", category: "Recruiting / staffing", priority: "P1", relationship: "competitor" },
  { name: "Trimble Viewpoint", domain: "trimble.com", category: "Construction operations", priority: "P1", relationship: "adjacent" },
  { name: "YOSS", domain: "learnyoss.com", category: "Education tools (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "Helios Education", domain: "heliosed.com", category: "Education tools (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "Vector Solutions / SafeSchools", domain: "vectorsolutions.com", category: "K-12 compliance LMS", priority: "P1", relationship: "competitor" },
  { name: "Motivity", domain: "motivity.net", category: "Healthcare workforce tools (verify fit)", priority: "P2", relationship: "adjacent" },
  { name: "Expiration Reminder", domain: "expirationreminder.com", category: "Credential expiration tracking", priority: "P1", relationship: "competitor" },
  { name: "Easygenerator", domain: "easygenerator.com", category: "LMS / authoring", priority: "P1", relationship: "competitor" },
  { name: "EasyLlama", domain: "easyllama.com", category: "Compliance training", priority: "P1", relationship: "competitor" },
  { name: "Teambridge", domain: "teambridge.com", category: "Workforce management", priority: "P1", relationship: "competitor" },
  { name: "Homebase", domain: "joinhomebase.com", category: "Hourly workforce management", priority: "P0", relationship: "competitor" },
  { name: "Pulpstream", domain: "pulpstream.com", category: "Leave / workflow automation", priority: "P1", relationship: "competitor" },
  { name: "Restroworks", domain: "restroworks.com", category: "Restaurant operations", priority: "P2", relationship: "adjacent" },
  { name: "Jolt", domain: "jolt.com", category: "Restaurant operations / training", priority: "P2", relationship: "adjacent" },
  { name: "Workwize", domain: "goworkwize.com", category: "Asset management / IT onboarding", priority: "P1", relationship: "competitor" },
  { name: "Fountain", domain: "fountain.com", category: "Frontline hiring / agentic workforce", priority: "P0", relationship: "competitor" },
  { name: "Paradox", domain: "paradox.ai", category: "Conversational AI hiring / onboarding", priority: "P0", relationship: "competitor" },
  { name: "Ashby", domain: "ashbyhq.com", category: "ATS / recruiting analytics", priority: "P0", relationship: "competitor" },
  { name: "Greenhouse", domain: "greenhouse.com", category: "ATS / recruiting", priority: "P0", relationship: "competitor" },
  { name: "Workable", domain: "workable.com", category: "Recruiting and HR software", priority: "P1", relationship: "competitor" },
  { name: "iCIMS", domain: "icims.com", category: "Enterprise ATS / onboarding", priority: "P1", relationship: "competitor" },
  { name: "SmartRecruiters", domain: "smartrecruiters.com", category: "ATS / recruiting", priority: "P1", relationship: "competitor" },
  { name: "Lever", domain: "lever.co", category: "ATS / recruiting CRM", priority: "P1", relationship: "competitor" },
  { name: "HireVue", domain: "hirevue.com", category: "AI/video interviewing", priority: "P1", relationship: "competitor" },
  { name: "Checkr", domain: "checkr.com", category: "Employment background checks", priority: "P1", relationship: "adjacent" },
  { name: "Hireology", domain: "hireology.com", category: "Multi-location hiring / ATS", priority: "P0", relationship: "competitor" },
  { name: "CareerPlug", domain: "careerplug.com", category: "SMB hiring / ATS", priority: "P1", relationship: "competitor" },
  { name: "Paylocity", domain: "paylocity.com", category: "HRIS / HCM / engagement", priority: "P0", relationship: "partner_ecosystem" },
  { name: "Paycor", domain: "paycor.com", category: "HCM / recruiting / HRIS", priority: "P0", relationship: "partner_ecosystem" },
  { name: "Paycom", domain: "paycom.com", category: "HCM / HRIS", priority: "P0", relationship: "partner_ecosystem" },
  { name: "Dayforce", domain: "dayforce.com", category: "HCM / workforce management", priority: "P0", relationship: "partner_ecosystem" },
  { name: "Workday", domain: "workday.com", category: "Enterprise HCM / AI agents", priority: "P0", relationship: "partner_ecosystem" },
  { name: "Blink", domain: "joinblink.com", category: "Frontline communications / AI knowledge", priority: "P0", relationship: "competitor" },
  { name: "Speakap", domain: "speakap.com", category: "Frontline employee experience", priority: "P1", relationship: "competitor" },
  { name: "Jostle", domain: "jostle.me", category: "Employee engagement / AI knowledge", priority: "P1", relationship: "competitor" },
  { name: "Achievers", domain: "achievers.com", category: "Recognition / engagement", priority: "P1", relationship: "competitor" },
  { name: "Culture Amp", domain: "cultureamp.com", category: "Employee experience / performance", priority: "P1", relationship: "competitor" },
  { name: "360Learning", domain: "360learning.com", category: "AI-enabled LMS", priority: "P1", relationship: "competitor" },
  { name: "Docebo", domain: "docebo.com", category: "AI-enabled LMS", priority: "P1", relationship: "competitor" },
  { name: "TalentLMS", domain: "talentlms.com", category: "LMS", priority: "P1", relationship: "competitor" },
  { name: "Absorb LMS", domain: "absorbai.com", category: "AI-enabled LMS", priority: "P1", relationship: "competitor" },
  { name: "Trainual", domain: "trainual.com", category: "SMB training / documentation", priority: "P1", relationship: "competitor" },
  { name: "eduMe", domain: "edume.com", category: "Frontline learning / knowledge", priority: "P1", relationship: "competitor" },
  { name: "ProviderTrust", domain: "providertrust.com", category: "Healthcare credential monitoring", priority: "P0", relationship: "competitor" },
  { name: "MedTrainer", domain: "medtrainer.com", category: "Healthcare compliance / training", priority: "P0", relationship: "competitor" },
  { name: "symplr", domain: "symplr.com", category: "Healthcare workforce / compliance", priority: "P0", relationship: "competitor" },
  { name: "HealthStream", domain: "healthstream.com", category: "Healthcare workforce / learning", priority: "P0", relationship: "competitor" },
  { name: "GoCo", domain: "goco.io", category: "SMB HRIS / onboarding", priority: "P1", relationship: "competitor" },
  { name: "Microsoft Viva", domain: "microsoft.com", category: "Employee experience / engagement", priority: "P1", relationship: "adjacent" },
  { name: "ADP", domain: "adp.com", category: "HR/payroll ecosystem partner", priority: "P1", relationship: "partner_ecosystem" },
  { name: "JobTarget", domain: "jobtarget.com", category: "Job distribution ecosystem partner", priority: "P2", relationship: "partner_ecosystem" },
  { name: "Talentech", domain: "talentech.com", category: "HR recruitment / onboarding", priority: "P1", relationship: "competitor" },
];

export async function POST(request: NextRequest) {
  try {
    const body: { projectId?: string } = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }

    let created = 0;
    let updated = 0;

    for (const row of COMPETITORS) {
      const existing = await prisma.competitor.findFirst({
        where: { projectId, domain: row.domain },
      });

      if (existing) {
        await prisma.competitor.update({
          where: { id: existing.id },
          data: row,
        });
        updated++;
      } else {
        await prisma.competitor.create({
          data: { projectId, ...row },
        });
        created++;
      }
    }

    return Response.json({ created, updated, total: COMPETITORS.length });
  } catch (error) {
    console.error("[POST /api/competitors/seed]", error);
    return Response.json({ error: "Seed failed" }, { status: 500 });
  }
}

import type { Customer } from "@shared/schema";

export interface ProfileSummary {
  basicInfo: string;
  workHistory: string;
  preferences: string;
  notes: string;
  recommendations: string[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getStatusEnglish(status: string): string {
  const statusMap: Record<string, string> = {
    "waiting": "Waiting",
    "In Progress": "In Progress", 
    "ready": "Ready",
    "completed": "Completed"
  };
  return statusMap[status] || status;
}

function getProgramTypeText(programType: string): string {
  const programMap: Record<string, string> = {
    "painting": "Painting",
    "one_time_ceramic": "One-Time Ceramic",
    "advanced_ceramic": "Advanced Ceramic"
  };
  return programMap[programType] || programType;
}

export function generateCustomerSummary(customer: Customer): ProfileSummary {
  // Calculate work history
  const registrationDate = new Date(customer.createdAt);
  const workDate = new Date(customer.workDate);
  const daysSinceRegistration = Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilWork = Math.floor((workDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  // Basic info summary
  const programType = getProgramTypeText(customer.programType || "painting");
  const basicInfo = `${customer.name} is a ${customer.isGroup === "true" ? `group of ${customer.groupSize} people` : "individual"} customer registered on ${formatDate(registrationDate)}. Contact: ${customer.phone}${customer.email ? `, Email: ${customer.email}` : ""}. Program: ${programType}.`;

  // Work history
  let workHistory = `Scheduled work date: ${formatDate(workDate)}`;
  if (daysUntilWork > 0) {
    workHistory += ` (in ${daysUntilWork} days)`;
  } else if (daysUntilWork === 0) {
    workHistory += " (today)";
  } else {
    workHistory += ` (${Math.abs(daysUntilWork)} days ago)`;
  }
  
  workHistory += `. Current status: ${getStatusEnglish(customer.status)}`;

  // Group preferences if applicable
  let preferences = "";
  if (customer.isGroup === "true") {
    preferences = `Group booking with ${customer.groupSize} participants. `;
    if (customer.groupId) {
      preferences += `Group ID: ${customer.groupId}. `;
    }
    preferences += `Enrolled in ${programType} program.`;
  } else {
    preferences = `Individual booking for ${programType} program.`;
  }

  // Notes based on data
  const notes = generateNotes(customer, daysSinceRegistration, daysUntilWork);

  // Recommendations
  const recommendations = generateRecommendations(customer, daysUntilWork);

  return {
    basicInfo,
    workHistory,
    preferences,
    notes,
    recommendations
  };
}

function generateNotes(customer: Customer, daysSinceRegistration: number, daysUntilWork: number): string {
  const notes: string[] = [];

  if (daysSinceRegistration === 0) {
    notes.push("New customer registered today.");
  } else if (daysSinceRegistration <= 7) {
    notes.push(`New customer registered ${daysSinceRegistration} days ago.`);
  }

  if (daysUntilWork < 0) {
    notes.push("Scheduled work date has passed. Status update may be needed.");
  } else if (daysUntilWork === 0) {
    notes.push("Scheduled work is today.");
  } else if (daysUntilWork <= 3) {
    notes.push("Work date is approaching soon.");
  }

  if (customer.isGroup === "true") {
    const groupSize = parseInt(customer.groupSize || "0");
    if (groupSize >= 5) {
      notes.push("Large group booking requires adequate preparation.");
    }
  }

  if (!customer.email) {
    notes.push("No email address on file. Consider collecting for better communication.");
  }

  return notes.join(" ");
}

function generateRecommendations(customer: Customer, daysUntilWork: number): string[] {
  const recommendations: string[] = [];

  if (daysUntilWork <= 1 && customer.status === "waiting") {
    recommendations.push("Consider updating status to 'In Progress'");
  }

  if (customer.isGroup === "true") {
    recommendations.push("Prepare adequate workspace and materials for group session");
    if (parseInt(customer.groupSize || "0") >= 4) {
      recommendations.push("Consider additional staff support for large group");
    }
  }

  if (!customer.email) {
    recommendations.push("Collect email address for improved communication");
  }

  if (daysUntilWork > 7) {
    recommendations.push("Schedule reminder contact before work date");
  }

  if (customer.status === "completed") {
    recommendations.push("Take photos of completed work");
    recommendations.push("Request customer feedback and reviews");
    recommendations.push("Offer return visit discount or loyalty program");
  }

  const programType = customer.programType || "painting";
  if (programType === "advanced_ceramic") {
    recommendations.push("Ensure kiln schedule and advanced tools are available");
  } else if (programType === "one_time_ceramic") {
    recommendations.push("Prepare beginner-friendly ceramic tools and guidance");
  }

  return recommendations;
}

export function generateQuickSummary(customer: Customer): string {
  const isGroup = customer.isGroup === "true";
  const groupInfo = isGroup ? `${customer.groupSize} people` : "Individual";
  const workDate = new Date(customer.workDate);
  const daysUntilWork = Math.floor((workDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const programType = getProgramTypeText(customer.programType || "painting");
  
  let timeInfo = "";
  if (daysUntilWork > 0) {
    timeInfo = `${daysUntilWork} days until work`;
  } else if (daysUntilWork === 0) {
    timeInfo = "Work scheduled today";
  } else {
    timeInfo = `Work was ${Math.abs(daysUntilWork)} days ago`;
  }

  return `${groupInfo} • ${programType} • ${getStatusEnglish(customer.status)} • ${timeInfo}`;
}
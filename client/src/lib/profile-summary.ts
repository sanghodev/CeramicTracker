import type { Customer } from "@shared/schema";

export interface ProfileSummary {
  basicInfo: string;
  workHistory: string;
  preferences: string;
  notes: string;
  recommendations: string[];
}

export function generateCustomerSummary(customer: Customer): ProfileSummary {
  // Calculate work history
  const registrationDate = new Date(customer.createdAt);
  const workDate = new Date(customer.workDate);
  const daysSinceRegistration = Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilWork = Math.floor((workDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  // Basic info summary
  const basicInfo = `${customer.name}님은 ${formatDate(registrationDate)}에 등록된 ${customer.isGroup === "true" ? `${customer.groupSize}명의 그룹` : "개인"} 고객입니다. 연락처는 ${customer.phone}${customer.email ? `, 이메일은 ${customer.email}` : ""}입니다.`;

  // Work history
  let workHistory = `작업 예정일: ${formatDate(workDate)}`;
  if (daysUntilWork > 0) {
    workHistory += ` (${daysUntilWork}일 후)`;
  } else if (daysUntilWork === 0) {
    workHistory += " (오늘)";
  } else {
    workHistory += ` (${Math.abs(daysUntilWork)}일 전)`;
  }
  
  workHistory += `. 현재 상태: ${getStatusKorean(customer.status)}`;

  // Group preferences if applicable
  let preferences = "";
  if (customer.isGroup === "true") {
    preferences = `그룹 작업을 선호하며, ${customer.groupSize}명이 함께 참여합니다. `;
    if (customer.groupId) {
      preferences += `그룹 ID: ${customer.groupId}`;
    }
  } else {
    preferences = "개인 작업을 선호합니다.";
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getStatusKorean(status: string): string {
  const statusMap: Record<string, string> = {
    "waiting": "대기 중",
    "In Progress": "진행 중",
    "ready": "준비 완료",
    "completed": "완료됨"
  };
  return statusMap[status] || status;
}

function generateNotes(customer: Customer, daysSinceRegistration: number, daysUntilWork: number): string {
  const notes: string[] = [];

  if (daysSinceRegistration === 0) {
    notes.push("오늘 새로 등록된 고객입니다.");
  } else if (daysSinceRegistration <= 7) {
    notes.push(`${daysSinceRegistration}일 전에 등록된 신규 고객입니다.`);
  }

  if (daysUntilWork < 0) {
    notes.push("작업 예정일이 지났습니다. 상태 확인이 필요할 수 있습니다.");
  } else if (daysUntilWork === 0) {
    notes.push("오늘이 작업 예정일입니다.");
  } else if (daysUntilWork <= 3) {
    notes.push("작업 예정일이 임박했습니다.");
  }

  if (customer.isGroup === "true") {
    const groupSize = parseInt(customer.groupSize || "0");
    if (groupSize >= 5) {
      notes.push("대규모 그룹으로 충분한 준비가 필요합니다.");
    }
  }

  if (!customer.email) {
    notes.push("이메일 정보가 없습니다. 추가 연락처 확보를 고려해보세요.");
  }

  return notes.join(" ");
}

function generateRecommendations(customer: Customer, daysUntilWork: number): string[] {
  const recommendations: string[] = [];

  if (daysUntilWork <= 1 && customer.status === "waiting") {
    recommendations.push("작업 상태를 '진행 중'으로 업데이트 고려");
  }

  if (customer.isGroup === "true") {
    recommendations.push("그룹 작업을 위한 충분한 공간과 재료 준비");
    if (parseInt(customer.groupSize || "0") >= 4) {
      recommendations.push("대규모 그룹을 위한 추가 지원 직원 배치 고려");
    }
  }

  if (!customer.email) {
    recommendations.push("이메일 주소 수집으로 소통 채널 다양화");
  }

  if (daysUntilWork > 7) {
    recommendations.push("작업 전 리마인더 연락 예약");
  }

  if (customer.status === "completed") {
    recommendations.push("완료 작품 사진 촬영 및 후기 요청");
    recommendations.push("재방문 유도를 위한 할인 쿠폰 제공 고려");
  }

  return recommendations;
}

export function generateQuickSummary(customer: Customer): string {
  const isGroup = customer.isGroup === "true";
  const groupInfo = isGroup ? `${customer.groupSize}명 그룹` : "개인";
  const workDate = new Date(customer.workDate);
  const daysUntilWork = Math.floor((workDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  let timeInfo = "";
  if (daysUntilWork > 0) {
    timeInfo = `${daysUntilWork}일 후 작업 예정`;
  } else if (daysUntilWork === 0) {
    timeInfo = "오늘 작업 예정";
  } else {
    timeInfo = `${Math.abs(daysUntilWork)}일 전 작업 예정이었음`;
  }

  return `${groupInfo} • ${getStatusKorean(customer.status)} • ${timeInfo}`;
}
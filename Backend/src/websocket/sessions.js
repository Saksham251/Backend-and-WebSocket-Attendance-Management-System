let activeSession = null;

export function startSession(classId) {
  if (activeSession) {
    throw new Error("Attendance session already active");
  }

  activeSession = {
    classId,
    startedAt: new Date().toISOString(),
    attendance: {}
  };
}

export function clearSession() {
  activeSession = null;
}

export { activeSession };

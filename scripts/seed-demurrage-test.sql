-- Local demo: expire PA-2026-00118 and refresh PA-2026-DMGTEST for demurrage billing tests.
-- Run: C:\xampp\mysql\bin\mysql.exe -u root ecms < scripts/seed-demurrage-test.sql

USE ecms;

-- PA-2026-00118 (evaluations/123): expired demurrage, confirmed schedule, QR not used at gate
UPDATE PreAdvicesSet
SET DemurrageValidUntil = DATE_SUB(CURDATE(), INTERVAL 14 DAY)
WHERE ReferenceNo = 'PA-2026-00118';

UPDATE SchedulesSet s
JOIN PreAdvicesSet p ON p.Id = s.PreAdviceId
SET s.Status = 2
WHERE p.ReferenceNo = 'PA-2026-00118';

UPDATE QRBookingsSet q
JOIN SchedulesSet s ON s.Id = q.ScheduleId
JOIN PreAdvicesSet p ON p.Id = s.PreAdviceId
SET q.IsUsed = 0
WHERE p.ReferenceNo = 'PA-2026-00118';

-- PA-2026-00117: still valid (contrast)
UPDATE PreAdvicesSet
SET DemurrageValidUntil = DATE_ADD(CURDATE(), INTERVAL 14 DAY)
WHERE ReferenceNo = 'PA-2026-00117';

-- Remove old billing rows so sync recreates them on next API call
DELETE FROM DemurrageBillingsSet WHERE PreAdviceId IN (
  SELECT Id FROM PreAdvicesSet WHERE ReferenceNo IN ('PA-2026-00118', 'PA-2026-DMGTEST')
);

SELECT ReferenceNo, DemurrageValidUntil, Status FROM PreAdvicesSet
WHERE ReferenceNo IN ('PA-2026-00117', 'PA-2026-00118', 'PA-2026-DMGTEST');

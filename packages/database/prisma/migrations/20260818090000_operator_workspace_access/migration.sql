CREATE TYPE "OperatorScope" AS ENUM ('SPOC', 'DPOC', 'GPOC');

ALTER TABLE "User" ADD COLUMN "operatorScope" "OperatorScope";

CREATE INDEX "User_operatorScope_idx" ON "User"("operatorScope");

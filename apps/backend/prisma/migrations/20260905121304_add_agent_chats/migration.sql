-- CreateTable
CREATE TABLE "agent_chats" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_chats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_chats_company_id_user_id_updated_at_idx" ON "agent_chats"("company_id", "user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "agent_chats" ADD CONSTRAINT "agent_chats_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_chats" ADD CONSTRAINT "agent_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

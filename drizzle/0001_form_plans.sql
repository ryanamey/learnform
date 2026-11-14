CREATE TABLE "form_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'Untitled plan' NOT NULL,
	"song" text DEFAULT '' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_plans" ADD CONSTRAINT "form_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_plans_user_idx" ON "form_plans" USING btree ("user_id");
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("Invalid environment configuration:", parsedEnv.error.flatten());
    throw new Error("Invalid environment configuration");
  }

export const env = parsedEnv.data;
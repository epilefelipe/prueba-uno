import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1714500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "merchant_status_enum" AS ENUM ('ACTIVE', 'BLOCKED');
    `);

    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
    `);

    await queryRunner.query(`
      CREATE TYPE "authorization_status_enum" AS ENUM ('SENT', 'SUCCESS', 'FAILED', 'TIMEOUT');
    `);

    await queryRunner.query(`
      CREATE TABLE "merchant" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "api_key" character varying NOT NULL,
        "status" "merchant_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_merchant" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_merchant_api_key" UNIQUE ("api_key")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "transaction" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "merchant_id" uuid NOT NULL,
        "external_order_id" character varying NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL,
        "status" "transaction_status_enum" NOT NULL DEFAULT 'PENDING',
        "idempotency_key" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_transaction_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_transaction_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "authorization" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" uuid NOT NULL,
        "merchant_id" uuid NOT NULL,
        "acquirer_reference" character varying,
        "status" "authorization_status_enum" NOT NULL DEFAULT 'SENT',
        "request_payload" json,
        "response_payload" json,
        "error_code" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authorization" PRIMARY KEY ("id"),
        CONSTRAINT "FK_authorization_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id"),
        CONSTRAINT "FK_authorization_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_merchant_id" ON "transaction" ("merchant_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_external_order_id" ON "transaction" ("external_order_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_authorization_transaction_id" ON "authorization" ("transaction_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_authorization_merchant_id" ON "authorization" ("merchant_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_authorization_merchant_id"`);
    await queryRunner.query(`DROP INDEX "IDX_authorization_transaction_id"`);
    await queryRunner.query(`DROP INDEX "IDX_transaction_external_order_id"`);
    await queryRunner.query(`DROP INDEX "IDX_transaction_merchant_id"`);
    await queryRunner.query(`DROP TABLE "authorization"`);
    await queryRunner.query(`DROP TABLE "transaction"`);
    await queryRunner.query(`DROP TABLE "merchant"`);
    await queryRunner.query(`DROP TYPE "authorization_status_enum"`);
    await queryRunner.query(`DROP TYPE "transaction_status_enum"`);
    await queryRunner.query(`DROP TYPE "merchant_status_enum"`);
  }
}

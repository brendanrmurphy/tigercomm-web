#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const API_BASE = "https://api.hubapi.com/cms/hubdb/2026-03";
const DEFAULT_TABLE = "faqs";
const DEFAULT_SOURCE = "templates/home-2026.html";

function parseArguments(argv) {
  const options = {
    dryRun: false,
    source: DEFAULT_SOURCE,
    table: DEFAULT_TABLE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--source") {
      options.source = argv[index + 1];
      index += 1;
    } else if (argument === "--table") {
      options.table = argv[index + 1];
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.source) {
    throw new Error("--source requires a file path.");
  }

  if (!options.table) {
    throw new Error("--table requires a HubDB table ID or internal name.");
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/import-homepage-faqs-to-hubdb.mjs [options]

Appends FAQ rows from the homepage template to HubDB, then publishes the table.

Options:
  --dry-run        Parse and print a summary without calling HubSpot
  --source <path>  Homepage template (default: ${DEFAULT_SOURCE})
  --table <id>     HubDB table ID or name (default: ${DEFAULT_TABLE})
  -h, --help       Show this help

Authentication:
  Set HUBSPOT_ACCESS_TOKEN to a private-app token with the hubdb scope.`);
}

function extractFaqs(template) {
  const faqObjectPattern = /\{\s*"question"\s*:\s*"(?:\\.|[^"\\])*"\s*,\s*"answer"\s*:\s*"(?:\\.|[^"\\])*"\s*\}/gs;
  const matches = template.match(faqObjectPattern) ?? [];

  return matches.map((match, index) => {
    let faq;

    try {
      faq = JSON.parse(match);
    } catch (error) {
      throw new Error(`Could not parse FAQ ${index + 1}: ${error.message}`);
    }

    if (!faq.question.trim() || !faq.answer.trim()) {
      throw new Error(`FAQ ${index + 1} has an empty question or answer.`);
    }

    return faq;
  });
}

function validateTableSchema(table) {
  const columns = new Map(
    (table.columns ?? [])
      .filter((column) => !column.deleted && !column.archived)
      .map((column) => [column.name, column]),
  );
  const missingColumns = ["question", "answer", "disabled", "category"].filter(
    (name) => !columns.has(name),
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `HubDB table is missing required column(s): ${missingColumns.join(", ")}.`,
    );
  }

  if (columns.get("disabled").type !== "BOOLEAN") {
    throw new Error(
      `HubDB column "disabled" must be BOOLEAN; found ${columns.get("disabled").type}.`,
    );
  }

  if (columns.get("category").type !== "MULTISELECT") {
    throw new Error(
      `HubDB column "category" must be MULTISELECT; found ${columns.get("category").type}.`,
    );
  }
}

async function hubspotRequest(token, path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const details =
      typeof data === "string"
        ? data
        : data?.message ?? data?.category ?? JSON.stringify(data);
    throw new Error(`HubSpot API ${response.status}: ${details}`);
  }

  return data;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const sourcePath = resolve(process.cwd(), options.source);
  const template = await readFile(sourcePath, "utf8");
  const faqs = extractFaqs(template);

  if (faqs.length === 0) {
    throw new Error(`No FAQ question/answer objects found in ${sourcePath}.`);
  }

  console.log(`Found ${faqs.length} FAQs in ${sourcePath}.`);

  if (options.dryRun) {
    for (const [index, faq] of faqs.entries()) {
      console.log(`${index + 1}. ${faq.question}`);
    }
    console.log("Dry run complete; HubSpot was not changed.");
    return;
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN is not set. Add a private-app token with the hubdb scope to your environment and run again.",
    );
  }

  const table = encodeURIComponent(options.table);
  const draftTable = await hubspotRequest(token, `/tables/${table}/draft`);
  validateTableSchema(draftTable);

  const createResult = await hubspotRequest(
    token,
    `/tables/${table}/rows/draft/batch/create`,
    {
      method: "POST",
      body: JSON.stringify({
        inputs: faqs.map((faq) => ({
          values: {
            question: faq.question,
            answer: faq.answer,
            disabled: 0,
            category: [{ name: "homepage", type: "option" }],
          },
        })),
      }),
    },
  );

  if (createResult?.status && createResult.status !== "COMPLETE") {
    throw new Error(
      `HubSpot returned batch status ${createResult.status}; the table was not published.`,
    );
  }

  const createdCount = createResult?.results?.length ?? faqs.length;

  if (createdCount !== faqs.length) {
    throw new Error(
      `HubSpot reported ${createdCount} created rows for ${faqs.length} inputs; the table was not published.`,
    );
  }

  console.log(`Appended ${createdCount} rows to the draft "${options.table}" table.`);
  await hubspotRequest(token, `/tables/${table}/draft/publish`, {
    method: "POST",
  });
  console.log(`Published the "${options.table}" table.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

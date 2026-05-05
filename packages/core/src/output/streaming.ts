// SPDX-License-Identifier: Apache-2.0

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export function formatNdjson(event: StreamEvent): string {
  return JSON.stringify(event) + "\n";
}

export function emitNdjson(event: StreamEvent, write: (chunk: string) => void = process.stdout.write.bind(process.stdout)): void {
  write(formatNdjson(event));
}

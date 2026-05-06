let capexIdCounter = 1000;

export function generateCapExId(projectNumber: string): string {
  const id = `Proj-CapExId_${capexIdCounter++}`;
  return id;
}

export function formatCapExId(raw: string): string {
  return raw.startsWith("Proj-CapExId_") ? raw : `Proj-CapExId_${raw}`;
}

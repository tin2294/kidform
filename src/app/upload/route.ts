import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const data = await req.arrayBuffer();

  const filename = `upload-${Date.now()}.pdf`;
  const filePath = path.join(process.cwd(), 'public/uploads', filename);

  fs.writeFileSync(filePath, Buffer.from(data));

  return NextResponse.json({ filePath: `/uploads/${filename}` });
}

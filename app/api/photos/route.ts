export async function POST() {
  return Response.json(
    { error: 'Photo upload endpoint pending. Presigned URLs will be generated here.' },
    { status: 501 }
  );
}

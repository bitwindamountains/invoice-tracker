import { z, ZodError } from "zod";
import { getApiWorkspace, hasSameOrigin } from "@/lib/api-session";
import {
  PaymentAccessDenied,
  PaymentConflict,
  PaymentNotFound,
  PaymentOverage,
  reviewConfirmation,
} from "@/services/payments";
const paramsSchema = z.object({ confirmationId: z.string().min(1).max(128) });
const headers = { "Cache-Control": "private, no-store" };
export async function POST(
  request: Request,
  context: { params: Promise<{ confirmationId: string }> },
) {
  try {
    if (!hasSameOrigin(request))
      return Response.json(
        { error: "Request origin was rejected." },
        { status: 403, headers },
      );
    const api = await getApiWorkspace(request);
    if (!api)
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    const params = paramsSchema.parse(await context.params);
    await reviewConfirmation(
      api.session.user.id,
      api.workspace.id,
      params.confirmationId,
      await request.json(),
    );
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError)
      return Response.json(
        { error: "Invalid review." },
        { status: 400, headers },
      );
    if (error instanceof PaymentOverage)
      return Response.json(
        { error: "Payment exceeds the remaining balance." },
        { status: 409, headers },
      );
    if (error instanceof PaymentConflict)
      return Response.json(
        { error: "This confirmation was already reviewed." },
        { status: 409, headers },
      );
    if (
      error instanceof PaymentNotFound ||
      error instanceof PaymentAccessDenied
    )
      return Response.json({ error: "Not found" }, { status: 404, headers });
    return Response.json(
      { error: "Confirmation could not be reviewed." },
      { status: 500, headers },
    );
  }
}

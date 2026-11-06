/**
 * An error that carries an HTTP status code.
 * Throw it anywhere (e.g. `throw new HttpError(404, "Not found")`) and the
 * central error handler turns it into a proper JSON response.
 *
 * Python equivalent: FastAPI's HTTPException.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

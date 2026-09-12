// WHAT: A generic middleware FACTORY — call validate(someSchema) and
//       get back a middleware that enforces that schema on req.body.
// WHY: Without this, every route would need its own hand-written
//      validation block. This is the layer that lets controllers
//      trust their input is already correct.
// HOW: Zod's safeParse never throws — it returns { success, data } or
//      { success, error }. On success we REPLACE req.body with the
//      parsed data (so trimmed/lowercased/defaulted values actually
//      reach the controller, not just the raw input).

export function validate(schema) {
  return function validateBody(req, res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    req.body = result.data;
    next();
  };
}

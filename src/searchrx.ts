import * as express from "express"
import * as drugs from "./drugs.json"

export const searchRx = (req: express.Request, res: express.Response) => {
  let term = '';
  if (typeof req.query.q === 'string') {
    term = req.query.q;
  } else if (Array.isArray(req.query.q) && typeof req.query.q[0] === 'string') {
    term = req.query.q[0];
  }
  const matchedDrugs = drugs.filter(
    (d: string) => d.toLowerCase().startsWith(term.toLowerCase())
  );
  res.send(matchedDrugs);
}

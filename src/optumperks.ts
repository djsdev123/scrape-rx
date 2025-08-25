import { Browser } from "puppeteer"
import * as express from "express"
import puppeteer from "puppeteer-extra"
// Pending XHR Puppeteer is a tool that detect when there is xhr requests not yet finished.
import { PendingXHR } from "pending-xhr-puppeteer"
import { validateRequest } from "./helpers"

const url = "https://perks.optum.com"
const source = "optumperks"

exports.invoke = (req: express.Request, res: express.Response) => {

  if (!validateRequest(req, res)) {
    return
  }

  puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
  .then(async (browser: Browser) => {
    const page = await browser.newPage()
    const pendingXHR = new PendingXHR(page)
    // Define cookie if needed, or remove this line if not required
    // Example cookie object:
    // const cookie = { name: "example", value: "value", domain: "perks.optum.com" }
    // await page.setCookie(cookie)
    await page.goto(url, { timeout: 0 })

    try {
      const drugStr = typeof req.query.drug === 'string'
        ? req.query.drug
        : Array.isArray(req.query.drug) && typeof req.query.drug[0] === 'string'
          ? req.query.drug[0]
          : '';
      await page.type("#txtDrug1", drugStr, { delay: 100 })
  await page.waitForSelector("ul.ui-autocomplete > li")
  await new Promise(res => setTimeout(res, 500))

      await Promise.all([
        page.waitForNavigation({ timeout: 3000 }),
        page.click("ul.ui-autocomplete > li"),
      ])

      await pendingXHR.waitForAllXhrFinished()
      await page.waitForSelector("#results-div .pharmacy-record:nth-child(3n)")

      const offers = await page.$$eval(
        "#results-div .pharmacy-record:nth-of-type(-n+3)",
        (divs: Element[]) => divs.map(div => {
          const { pharmacy, price } = (div as HTMLElement).dataset
          return {
            pharmacyName: pharmacy,
            price
          }
        })
      )

      const location = await page.$eval(
        "#radiusSearchDisplayDiv",
        div => div.textContent?.trim()
      )

      res.status(200).send({ source, offers, location })
      await browser.close()
    } catch (error) {
      console.error(error)
      res.status(200).send({ source, offers: [], error: (error as Error).toString() })
      await browser.close()
    }
  })
}

import { Browser } from "puppeteer"
import * as express from "express"
import puppeteer from "puppeteer-extra"
import { validateRequest } from "./helpers"

const url = "https://www.wellrx.com/"
const source = "wellrx"

export const invoke = (req: express.Request, res: express.Response) => {

  if (!validateRequest(req, res)) {
    return
  }

  puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
  .then(async (browser: Browser) => {
    const page = await browser.newPage()
    await page.goto(url, { timeout: 0 })

    try {
      await page.waitForSelector("#drugname", { timeout: 3000 })
  const drugStr = typeof req.query.drug === 'string' ? req.query.drug : Array.isArray(req.query.drug) && typeof req.query.drug[0] === 'string' ? req.query.drug[0] : '';
  await page.type("#drugname", drugStr, { delay: 300 })
      await page.waitForSelector("ul.ui-autocomplete")
      await page.click("ul.ui-autocomplete > li")
      await new Promise(res => setTimeout(res, 500))//fix
  const zipcodeStr = typeof req.query.zipcode === 'string' ? req.query.zipcode : Array.isArray(req.query.zipcode) && typeof req.query.zipcode[0] === 'string' ? req.query.zipcode[0] : '';
  await page.type("#address", zipcodeStr)

      await Promise.all([
        page.waitForNavigation(),
        page.click("#btnSearch"),
      ])

      await page.waitForSelector(".price-list-item")
      const offers = await page.$$eval(
        ".price-list-item:nth-of-type(-n+3)",
        divs => divs.map(div => {
          const pharmacy = div.querySelector("div > div > p")
          const price = div.querySelector(".pricesm")

          return {
            pharmacyName: pharmacy ? pharmacy.textContent : null,
            price: price ? price.textContent : null,
          }
        })
      )

      const location = req.query.zipcode
      res.status(200).send({ source, offers, location })
      await browser.close()
    } catch (error) {
      console.error(error)
      res.status(200).send({ source, offers: [], error: (error as Error).toString() })
      await browser.close()
    }
  })
}

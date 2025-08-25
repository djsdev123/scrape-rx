import { Browser } from "puppeteer"
import * as express from "express"
import puppeteer from "puppeteer-extra"
import { validateRequest } from "./helpers"

const url = "https://rxsaver.retailmenot.com"
const source = "rxsaver"

exports.invoke = (req: express.Request, res: express.Response) => {

  if (!validateRequest(req, res)) {
    return
  }

  puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
  .then(async (browser: Browser) => {
    const page = await browser.newPage()
    await page.goto(url, { timeout: 0 })

    try {
      await page.waitForSelector(".drug-search-auto-complete input", { timeout: 3000 })
  const drugStr = typeof req.query.drug === 'string' ? req.query.drug : Array.isArray(req.query.drug) && typeof req.query.drug[0] === 'string' ? req.query.drug[0] : '';
  await page.type(".drug-search-auto-complete input", drugStr)
      await page.waitForSelector(".ant-select-dropdown-menu")
      await new Promise(res => setTimeout(res, 500)) //fix

      await Promise.all([
        page.waitForNavigation(),
        page.click(".ant-select-dropdown-menu > li"),
      ])

      await page.waitForSelector(".zip-code a")
      await page.click(".zip-code a")
      await page.waitForSelector("input.zip-code-input-search")
  const zipcodeStr = typeof req.query.zipcode === 'string' ? req.query.zipcode : Array.isArray(req.query.zipcode) && typeof req.query.zipcode[0] === 'string' ? req.query.zipcode[0] : '';
  await page.type("input.zip-code-input-search", zipcodeStr)
      await page.click(".zip-code button")

      await page.waitForSelector(".results-list > div")

      const offers = await page.$$eval(
        ".results-list > div:nth-of-type(-n+3)",
        divs => divs.map(div => {
          const pharmacy = div.querySelector(".pharmacy-name")
          const price = div.querySelector(".result-item-price")

          return {
            pharmacyName: pharmacy ? pharmacy.textContent : null,
            price: price ? price.textContent : null,
          }
        })
      )

      const location = await page.$eval(
        ".best-prices-in-zip span",
        span => span.textContent
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

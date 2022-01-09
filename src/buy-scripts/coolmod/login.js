const { createCursor, getRandomPagePoint } = require('ghost-cursor')
const { randomNumberRange } = require('ghost-cursor/lib/math')
const { humanType } = require('../../utils')

module.exports = async (page, { email, password }) => {
  await page.goto('https://www.coolmod.com/cuenta/', {
    waitUntil: 'networkidle2'
  })

  await page.waitForTimeout(randomNumberRange(1000, 3000))

  const cursor = createCursor(page, await getRandomPagePoint(page))

  await page.evaluate("[...document.getElementsByClassName('confirm')].forEach(el => el.click())")
  let checkemailInp = await page.$("input[name='inputEmail']")
  if(!checkemailInp && page.url().includes('https://www.coolmod.com/cuenta')){
    console.log("Already logged-in");
    return true;
  }
  await cursor.click("input[name='inputEmail']", {
    waitForClick: randomNumberRange(1000, 3000),
    moveDelay: randomNumberRange(1000, 3000),
    paddingPercentage: 20
  })
  await humanType(page, email.trim())

  await cursor.click("input[name='inputPassword']", {
    waitForClick: randomNumberRange(1000, 3000),
    moveDelay: randomNumberRange(1000, 3000),
    paddingPercentage: 20
  })
  await humanType(page, password.trim())
  await page.keyboard.press('Enter')

  await page.waitForTimeout(10000)

  const emailInp = await page.$("input[name='inputEmail']")

  return !emailInp && page.url().includes('https://www.coolmod.com/cuenta')
}

const data = require('../../../puppeteer-config.json')

module.exports = async (page, link) => {
  await page.goto(link, { waitUntil: 'networkidle2' })
  await page.waitForTimeout(2000)
  await page.evaluate("document.getElementById('productbuybutton1').click()")
  await page.waitForTimeout(2000)

  await page.goto('https://www.coolmod.com/pedido/', { waitUntil: 'networkidle2' })
  if(!page.url().includes('https://www.coolmod.com/pedido')){
    return false;
  }
  await page.waitForTimeout(1000)

  await page.evaluate("document.getElementById('shipmentselector1input').click()")

  await page.waitForTimeout(1000)

  console.log('Selecting bank transfer as payment');

  await page.evaluate("document.getElementById('paymentselector82input').click()")

  await page.waitForTimeout(1000)

  await page.evaluate("document.getElementById('termsandcondinpt').click()")
  await page.evaluate("document.getElementById('warantysdevolutionsinpt').click()")

  await page.waitForTimeout(1000)

  console.log('Attempting buy');

  if (!data.debug) await page.evaluate("document.getElementById('buttonSendCheckout').click()")

  await page.waitForTimeout(6000)

  return page.url().includes('https://www.coolmod.com/tramitar-pedido')
}

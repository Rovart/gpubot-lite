import { randomNumberRange } from "ghost-cursor/lib/math";
import { html2json } from "html2json";
import { open } from "open";
import { Browser, Page } from "puppeteer";
import sanitizeHtml from "sanitize-html";
import Container from "typedi";
import { Article, ArticleConfig, CategoryConfig } from "./models";
import Log from "./utils/log";
import Utils from "./utils/utils";
import Validator from "./validator";
import * as cheerio from 'cheerio';
const useProxy = require('puppeteer-page-proxy');
const requestpromise = require("request-promise");
const path = require('path');

/**
* Instantiable class that will take care of tracking a article and purchasing it if needed.
*/
export default class ArticleTracker {
  private readonly name: string;
  private readonly config: CategoryConfig;
  private readonly debug: boolean;
  private readonly purchase: boolean;
  private readonly purchaseSame: boolean;

  private previous: Article[] = [];
  // private buying = false;
  private done = false;
  private checking = false;

  private browser: Browser;
  private page!: Page;

  // Inject needed services
  private readonly validator = new Validator();

  constructor(
    id: string,
    config: CategoryConfig,
    browser: Browser,
    purchase: boolean,
    purchaseSame: boolean,
    debug: boolean
  ) {
    this.name = id;
    this.config = config;
    this.browser = browser;
    this.purchase = purchase;
    this.purchaseSame = purchaseSame;
    this.debug = debug;
    this.start();
  }
  async login(): Promise<boolean> {
    //LOG IN
    if (this.purchase && this.config.purchase && this.config['login'] !== undefined) {
      await this.newPage();
      console.log(`Attempting login in ${this.config.webstore}`);

      const loginResult = await require(path.join(__dirname, 'buy-scripts', this.config.webstore, 'login'))(this.page, {
        email: this.config.login.user,
        password: this.config.login.password
      })

      if (loginResult)
      console.log(`Successfully logged in as ${this.config.login.user} to ${this.config.webstore}`);
      else {
        console.log(`Login on ${this.config.webstore} failed. Check your credentials... Trying again.`);
        let tryagain:boolean = await this.login();
        return tryagain;
      }
      await this.page.close()
      return true;
    }
    return false;
    //
  }
  async start(): Promise<void> {
    //Log in
    await this.login();
    // Create the page that will be used for this tracker
    await this.newPage();
    // First iteration
    this.update();

    // Infinite loop
    this.loop();
  }

  getName(): string {
    return this.name;
  }

  stop(): void {
    this.done = true;
  }

  reconnect(browser: Browser): void {
    this.browser = browser;
    this.newPage();
  }

  async newPage(): Promise<void> {
    this.page = this.debug
    ? await this.browser.newPage()
    : await Utils.createHeadlessPage(this.browser);
  }

  // Infinite loop with a pseudo-random timeout to fetch data imitating a human behaviour
  loop(): void {
    if (this.done) {
      Log.success(`'${this.name} tracker' - Stopped successfully.`, true);
      return;
    }

    setTimeout(() => {
      this.update();
      this.loop();
    }, randomNumberRange(this.config.minUpdateSeconds * 1000, this.config.maxUpdateSeconds * 1000));
  }

  async update(): Promise<void> {

    if (this.done) {
      return;
    }

    if (!this.browser.isConnected()) {
      Log.error(`'${this.name} tracker' - Browser is disconnected!`, true);
      return;
    }

    if (this.checking) {
      Log.important(
        `'${this.name} tracker' - Tried to update again while still checking data, reduce the update time or the number of pages to check in 'config.json'`,
        true
      );
      return;
    }

    this.checking = true;

    // Relaunch page if it is closed
    if (this.page.isClosed()) {
      await this.newPage();
    }

    let pages = "";
    try {
      pages = await this.checkPages(0, "");
    } catch (error) {
      Log.error(
        `'${this.name} tracker' - Error while checking page data: ${error}`,
        true
      );
      this.checking = false;
      return;
    }

    // Convert the cleaned HTML output to JSON objects
    const json = html2json(pages);
    // Check the JSON schema validity
    const valid = this.validator.validateArticle(json);
    if (!valid) {
      Log.error(
        `'${this.name} tracker' - JSON validation error: ${JSON.stringify(
          this.validator.getLastError()
        )} `
      );
      this.checking = false;
      return;
    }
    const matches = this.processData(json);

    this.checkIfNew(matches);
  }

  //Fetch a random free proxy
  async fetchproxys(){
    let ip_addresses:string[] = [];
    let port_numbers:string[] = [];
    await requestpromise("https://sslproxies.org/", function(error: string, response: any, html: string) {
      if (!error && response.statusCode == 200) {
        const $ = cheerio.load(html);
        $("td:nth-child(1)").each(function(this: cheerio.Element, index:number, value:any) {
          ip_addresses[index] = $(this).text();
        });

        $("td:nth-child(2)").each(function(this: cheerio.Element, index:number, value:any) {
          port_numbers[index] = $(this).text();
        });
      } else {
        console.log("Error loading proxy, please try again");
      }

      ip_addresses.join(", ");
      port_numbers.join(", ");
    });
    let random_number = Math.floor(Math.random() * 100);
    return 'http://'+ip_addresses[random_number]+':'+port_numbers[random_number];
  }

  async checkPages(pageCount: number, result: string): Promise<string> {
    //Start proxy (NOT WORKING AS EXPECTED)
    if(this.config.webstore == "testwebsite"){
      let proxy = await this.fetchproxys();
      console.log("Using proxy: "+proxy);
      await this.page.setRequestInterception(true);

      this.page.on('request', async (requestresult) => {
        await useProxy(requestresult, proxy);
      });
    }

    await this.page.goto(
      this.config.url,
      {
        waitUntil: "networkidle2",
      }
    );
    let bodyHTML: string = "";
    if(this.config.webstore == "coolmod"){
      bodyHTML = await this.page.evaluate(() => document.getElementsByClassName("categorylistproducts")[0].innerHTML);
    }
    let clean: string = "";
    // Allow only a restricted set of tags and attributes to clean the HTML
    if(this.config.webstore == "coolmod"){
      clean = sanitizeHtml(bodyHTML, {
        allowedTags: ["div", "a"],
        disallowedTagsMode: 'discard',
        allowedAttributes: {
          div: ["data-price", "data-name", "data-stock"],
          a: ["href"]
        },
        allowedClasses: {
          div: ['productInfo']
        }
      }).replace(/\n{2,}/g, "\n");
      // Check if the page has articles
      if (clean.includes(`<div class="productInfo`)) {
        result += clean;
        const nextPage = pageCount + 1;

        // Return if all needed pages have been checked
        if (nextPage >= this.config.checkPages) {
          return result;
        }

        //  Check next page
        await this.page.waitForTimeout(randomNumberRange(1000, 2000));
        return await this.checkPages(nextPage, result);
      } else {
        return result;
      }
    }
    return "";
  }
  scancoolmodurl(element: string){
    const linkRx = /"href":"([^"]*)"/;
    let url = "";
    url = element.match(linkRx)![1];
    return url;
  }
  processData(json: any): Article[] {
    // List of items that match the requisites (each item is a string with price, name and URL)
    const matches: Article[] = [];

    if (!json || !json.child) {
      Log.error("Missing data, skipping...");
      return [];
    }
    let counter = 0;
    json.child.forEach((element: any) => {
      if (element.attr && (element.tag === "article" || element.tag === "div" || element.tag === "li")){
        counter++;
        let price = element.attr["data-price"];
        const store = this.config.name;
        let stock = 1;
        if(typeof element.attr["data-stock"] !== "undefined"){
          //stock = element.attr["data-stock"];
        }else{
          stock = 1;
        }
        let gpu_url = "";
        let nametemp;
        //Coolmod
        if(element.tag === "div" && element.attr.class === "productInfo" && this.config.webstore == "coolmod"){
          gpu_url = this.scancoolmodurl(JSON.stringify(element));
          let name = gpu_url.replace(/\//g,"");
          if(JSON.stringify(element).toLowerCase().includes("agotado")){
            stock = 0;
          }
          name = name.replace(/-/g," ");
          let elementpush = {
            "class": element.attr.class,
            "data-price": element.attr["data-price"],
            "data-stock": stock,
            "data-name": name.split(" "),
            "data-url": gpu_url
          };
          element.attr = elementpush;
        }
        nametemp = element.attr["data-name"].map((v: string) =>
        v.toLowerCase()
      );
      const name = nametemp;
      let purchase = true;
      // Check if the price is below the maximum of this category (if defined)
      if (this.config.maxPrice && price >= this.config.maxPrice) {
        return;
      }
      // Check if out of stock
      if ((element.child.find((c: any) => c.text?.toLowerCase().includes("sin fecha de entrada")) && element.tag === "article") || (element.tag === "div" && element.attr.class === "productInfo" && stock <= 0) || (element.tag === "div" && element.attr.class === "productInfo" && element.child.find((c: any) => c.text?.toLowerCase().includes("agotado")))) {
        return;
      }
      if (
        this.config.articles.some((article: ArticleConfig) => {
          // Check if the price is below the maximum of this article (if defined)
          if (article.maxPrice && price >= article.maxPrice && typeof price !== "undefined") {
            return false; // skip
          }

          // Check if any of the excluded strings are in the title of the article
          const excluded = this.config.exclude.concat(article.exclude);
          if (excluded.some((e: string) => name.includes(e.toLowerCase()))) {
            return false; // skip
          }

          // Check if all strings of the model are in the title of the article
          if (
            article.model.every((m: string) => name.includes(m.toLowerCase()))
          ) {
            // Check if the purchase of this article is explicitly disabled
            if (article.purchase === false) {
              purchase = false;
            }
            return true;
          }
          return false; // skip
        })
      ) {
        //  Build link, name and price of the article in a single string
        let link = "https://www.coolmod.com";
        if(this.config.webstore == "coolmod"){
          link = link + element.attr["data-url"];
        }
        const nameText = `[${name.join([" "])}](${link})`;
        const priceText = `*${price} EUR*`;
        const match = `${priceText}\n${nameText}`;
        const article: Article = { name, price, link, match, purchase };
        matches.push(article);
      }
    }
  });
  console.log(this.config.name+": "+counter+" articles");
  return matches;
}

checkIfNew(matches: Article[]): void {
  // Check if there is any new article - use difference to only get the new ones
  const difference = matches.filter(
    (a) => !this.previous.find((b) => a.link === b.link)
  );

  if (difference.length > 0) {
    Log.breakline();
    Log.success(`${this.name} - Nuevos artículos encontrados:`, true);
    Log.important("\n" + difference.map((v) => v.match).join("\n\n"));
    Log.breakline();

    // opens the url in the default browser
    if (this.config.openOnBrowser) {
      difference
      .map((v) => v.link)
      .forEach((link) => {
        open(link);
      });
    }
    // Try to purchase the new matches if the bot and the category have the purchase enabled
    if (this.purchase && this.config.purchase && this.config['login'] !== undefined) {
      this.checkPurchaseConditions(difference, this.config.webstore);
      //this.checkPurchaseConditions(difference);
    }
  } else {
    Log.info(`${this.name} - No se encontraron nuevos articulos...`, true);
  }

  // Update previous
  this.previous = matches;

  this.checking = false;
}
checkPurchaseConditions(articles: Article[], store: String): void {
  articles.forEach(async (article) => {
    if (article.purchase && this.purchase && this.config.purchase) {
      const buy = require(path.join(__dirname, 'buy-scripts', store, 'buy'))
      const itemPage = await Utils.createHeadlessPage(this.browser);
      let attempting = false;
      try {
        attempting = await buy(itemPage, article.link);
      } catch (err) {
        console.log(err);
        console.log("Error comprando, intentando de nuevo...");
        return this.checkPurchaseConditions(articles, store);
      }
      if (attempting) {
        console.log("!!!!! COMPRADO !!!!!");
        article.purchase = false;
        this.config.purchase = false;
      }else{
        console.log("Alguien se adelantó...");
      }
      await itemPage.close()
    }
  });
}
}

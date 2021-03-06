import Ajv, { ValidateFunction } from "ajv";

export default class Validator {
  private readonly articleValidator: ValidateFunction<unknown>;

  constructor() {
    this.articleValidator = this.prepareArticleValidator();
  }

  validateArticle(json: any): boolean {
    return this.articleValidator(json);
  }

  getLastError() {
    return this.articleValidator.errors;
  }

  private prepareArticleValidator(): ValidateFunction<unknown> {
    const ajv = new Ajv();
    const schema = {
      type: "object",
      properties: {
        child: {
          type: "array",
          items: {
            type: "object",
            properties: {
              attr: {
                type: "object",
                properties: {
                  "data-name": { type: "array" },
                  "data-price": { type: "string" },
                },
                required: ["data-price"],
              },
            },
          },
        },
      },
      required: ["child"],
      additionalProperties: true,
    };
    return ajv.compile(schema);
  }
}

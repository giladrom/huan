const WAPI = require("@woocommerce/woocommerce-rest-api").default;
const WC = new WAPI({
  url: "https://gethuan.com",
  consumerKey: "ck_3dfb9f2bb3aa57a66d2a0d288489dee2c11f3f54",
  consumerSecret: "cs_a04586bcbdf544140e27418f036e2e09036aae92",
  version: "wc/v1",
  queryStringAuth: true, // Force Basic Authentication as query string true and using under HTTPS
  wpAPI: true,
});

var moment = require("moment");

WC.get("orders", { after: moment().subtract(1, "days").format() })
  .then((response) => {
    response.data.forEach((order) => {
      if (Number(order.total) > 9.99) {
        console.log(
          order.total,
          order.line_items[0].name,
          order.billing.city,
          order.billing.state,
          moment.utc(order.date_created).fromNow()
        );
      }
    });
  })
  .catch((error) => {
    console.log("WooCommerce  Error", JSON.stringify(error));
  });

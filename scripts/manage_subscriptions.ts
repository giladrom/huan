const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const WooCommerce = new WooCommerceRestApi({
  url: "https://gethuan.com",
  consumerKey: "ck_3dfb9f2bb3aa57a66d2a0d288489dee2c11f3f54",
  consumerSecret: "cs_a04586bcbdf544140e27418f036e2e09036aae92",
  version: "wc/v1",
  queryStringAuth: true, // Force Basic Authentication as query string true and using under HTTPS
  wpAPI: true,
});

WooCommerce.get("subscriptions", { search: "bobbiekulakowski27@gmail.com" })
  .then((response) => {
    console.log(
      "WooCommerce Subscriptions Reply",
      JSON.stringify(response.data, null, 2)
    );
  })
  .catch((error) => {
    console.log("WooCommerce  Error", JSON.stringify(error));
  });

const WCAPI = require("@woocommerce/woocommerce-rest-api").default;
const WCA = new WCAPI({
    url: "https://www.gethuan.com",
    consumerKey: "ck_3dfb9f2bb3aa57a66d2a0d288489dee2c11f3f54",
    consumerSecret: "cs_a04586bcbdf544140e27418f036e2e09036aae92",
    version: "wc/v3",
    queryStringAuth: true, // Force Basic Authentication as query string true and using under HTTPS
    wpAPI: true,
});

const r = makeid(5);

const coupon_data = {
    create: [
        {
            code: r,
            discount_type: "percent",
            amount: "100",
            individual_use: true,
            exclude_sale_items: true,
            free_shipping: true,
            usage_limit: 1,
            usage_limit_per_user: 1,
            product_ids: [20056],

            // METADATA DOESNT WORK FOR SOME REASON
            meta_data: [
                {
                    key: "_wc_url_coupons_unique_url",
                    value: "coupons/" + r,
                },
                {
                    key: "_wc_url_coupons_product_ids",
                    value: [
                        20056
                    ]
                },
                {
                    key: "_wc_url_coupons_redirect_page",
                    value: "3349"
                },
                {
                    key: "_wc_url_coupons_redirect_page_type",
                    value: "page"
                },
            ],
        },
    ],
};

WCA.post("coupons/batch", coupon_data)
    .then((response) => {
        console.log("WooCommerce Reply", JSON.stringify(response.data));

        logger.info({ message: 'WooCommerce Reply: ' + JSON.stringify(response.data) });

        if (response.data.create[0]) {
            if (
                response.data.create[0].error &&
                response.data.create[0].error.message ===
                "The coupon code already exists"
            ) {
                return { message: r, code: 200 };
            } else {
                console.log(response.data);

                console.log("WooCommerce coupons created successfully");
                return { message: r, code: 200 };
            }
        } else {
            console.log(response.data);

            return { message: r, code: 200 };
        }
    })
    .catch((error) => {
        console.log("WooCommerce Error", JSON.stringify(error));
        return { message: r, code: 401 };
    });


function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

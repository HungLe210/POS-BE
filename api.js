const express = require("express")
const router = express.Router()
require("./db")
router.use(require("./api_auth"))

//     < em class="markup--em markup--pre-em" >// router.use(require("./api_product"))
// </em ><em class="markup--em markup--pre-em">// router.use(require("./api_employee"))
// </em><em class="markup--em markup--pre-em">// router.use(require("./api_customer"))
// </em><em class="markup--em markup--pre-em">// router.use(require("./api_pos_machine"))
// </em><em class="markup--em markup--pre-em">// router.use(require("./api_branch"))

module.exports = router
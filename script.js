class MenuItem {
    // MenuItem class represents an individual menu item

    constructor(id, name, price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }
}


class Menu {
    /* handle all menu operations */

    constructor() {
        this._menuItems = [];  // all items on the menu
    }

    get menu() {
        return this._menuItems
    }

    set menu(menuArray) {
        this._menuItems = [];
        menuArray.forEach(menuItem => {
            // in production do a check on each item
            let currItem = {};
            currItem.sku = menuItem[0];
            currItem.description = menuItem[1];
            currItem.price = menuItem[2];
            currItem.taxRate = menuItem[3];
            currItem.image = menuItem[4];
            this._menuItems.push(currItem);
        });
    }

    showRecipe() {
        // show a selected recipe
    }
}

class Order {

    constructor() {
        //this._menu = [];
        this._previousSales = [];
        this._previousPayments = [];
        this._invoiceNumber = "";
        this._order = [];
        this._payment = {
            amountPaid: 0,
            type: "",
            changeTip: 0
        };
    }

    get previousSales() {
        return this._previousSales;
    }

    set previousSales(previousSalesData) {
        this._previousSales = previousSalesData;
    }

    get previousPayments() {
        return this._previousPayments;
    }

    set previousPayments(previousPaymentsData) {
        this._previousPayments = previousPaymentsData;
    }

    get invoiceNumber() {
        return this._invoiceNumber;
    }

    set invoiceNumber(num) {
        this._invoiceNumber = num.toString();
    }

    get order() {
        return this._order;
    }

    set order(data) {
        this._order = data;
    }

    get payment() {
        return this._payment;
    }

    set payment(payment) {
        this._payment = payment;
    }

    generateInvoiceNumber() {
        if (this.previousSales.length < 1 || this.previousSales == undefined) {
            this.invoiceNumber = 1;
        } else {
            // make array of invoice numbers and find highest one
            let skuArray = this.previousSales.map(sale => sale[1]);
            let highest = skuArray.reduce(function(a, b) {
                return Math.max(a, b);
            });
            this.invoiceNumber = highest + 1;
        }
        Ui.invoiceNumber(this.invoiceNumber);
    }

    selectMenuItem(quantity, data) {
        /*
        if (? == 'recipe') {
            showRecipe(data);
        } else if(? == 'pos') {
        */
        this.addOrderLine(quantity, data);
    }

    addOrderLine(quantity, data) {
        // add items to order/receipt
        let currentLine = {};
        let lineData = JSON.parse(data);
        currentLine.sku = lineData.sku;
        currentLine.description = lineData.description;
        currentLine.quantity = quantity;
        currentLine.price = Utilities.roundToTwo(parseFloat(lineData.price));
        currentLine.subtotal = currentLine.quantity * currentLine.price;
        currentLine.tax = Utilities.roundToTwo(lineData.taxRate * currentLine.subtotal);

        this.order.push(currentLine);
        Ui.receiptDetails(this);
    }

    deleteOrderLine(index) {
        // delete items from order/receipt
        this.order.splice(index, 1);  // remove order at index value
        Ui.receiptDetails(this);
    }

    clearOrder() {
        this.order = [];
        Ui.receiptDetails(this);

    }
    
    getSummary() {
        // calculate subtotal, tax and grandtotal summary
        const summary = {
            subtotal: 0,
            tax: 0,
            grandtotal: 0
        }
        this.order.forEach(orderLine => {
            summary.subtotal += orderLine.subtotal;
            summary.tax += orderLine.tax;
        })
        summary.grandtotal = summary.subtotal + summary.tax;
        return summary;
    }

    changePayment(input) {
        // change payment types
        const orderGrandTotal = this.getSummary().grandtotal;
        if(input.amountPaid != null) this.payment.amountPaid = parseFloat(input.amountPaid);
        if(input.type != null) this.payment.type = input.type;
        if(this.payment.amountPaid >= orderGrandTotal) {
            this.payment.changeTip = this.payment.amountPaid - orderGrandTotal;
            Ui.closeButton(false);
        } else {
            this.payment.changeTip = 0;
            Ui.closeButton(true);
        }
        Ui.paymentSummary(this);
    }

    clearPayment() {
        this.payment = {
            amountPaid: 0,
            type: "",
            changeTip: 0
        };
        Ui.paymentSummary(this);
    }

    exportOrder(date) {
        let exportData = [];  // used when exporting to google sheets
        this.order.forEach(orderLine => {
            let currentLine =[];
            currentLine[0] = date;
            currentLine[1] = this.invoiceNumber;
            currentLine[2] = orderLine.sku;
            currentLine[3] = orderLine.quantity;
            currentLine[4] = orderLine.price;
            currentLine[5] = orderLine.tax;
            exportData.push(currentLine);
            this.previousSales.push(currentLine);
        });
        return exportData;

    }

    exportPayment(date) {
        let currentPayment = [[]];
        const tipChange = Utilities.roundToTwo(this.payment.amountPaid - this.getSummary().grandtotal);
        currentPayment[0] = date;
        currentPayment[1] = this.invoiceNumber;
        currentPayment[2] = this.getSummary().grandtotal;
        currentPayment[3] = this.payment.type;
        if (this.payment.type == "cash") {
            currentPayment[4] = 0;
        } else {
            currentPayment[4] = tipChange;
        }
        this.previousPayments.push(currentPayment[0]);
        return currentPayment;
    }

    closeSale() {
        const date = new Date();
        const orderData = this.exportOrder(date);
        const paymentData = this.exportPayment(date);
        const exportData = {
            order : orderData,
            payment : paymentData
        }
        Ui.hidePaypad();
        this.clearPayment();
        this.clearOrder();
        this.invoiceNumber = +this.invoiceNumber + 1;  // invoice number is str
        Ui.invoiceNumber(this.invoiceNumber);
        //google.script.run.setData(JSON.stringify(exportData));  // call function to store data in sheet
    }
}

class Ui {
    /* User interface class
    //TODO add an updateXXX method to update different panes of the ui
    */

    constructor(menu, order) {
        this._order = order;
        this._menu = menu;
        this.displayOrderTab = true; // Variable controlling the state of the display

        // Create and set up GUI elements
        this.setupUI(menu, order);
    }

    setupUI(menu, order) {
        this.addEventListeners();
        this.info("Restaurant 351");
        this.menu(menu, order);
        Ui.invoiceNumber(order.invoiceNumber);
    }

    addEventListeners(order) {
        // STATIC EVENT LISTENERS

        // tab buttons
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                Ui.openTab(button.getAttribute("tab-id"));
            });
        });

        // clear-order icon click
        document.getElementById("clear-order").addEventListener('click', () => {
            this._order.clearOrder();
        });

        // payment-related icon clicked
        document.querySelectorAll('.paypad-show').forEach(button => {
            button.addEventListener('click', () => {
                Ui.showPaypad(this._order);
                this._order.changePayment(JSON.parse(button.getAttribute('data-payment-type')));
            });
        });

        // clear paypad icon clicked
        document.getElementById('paypad-close').addEventListener('click', () => {
            this._order.clearPayment();
            Ui.hidePaypad();
        });

        document.querySelectorAll('.paypad-btn').forEach(button => {
            button.addEventListener('click', () => {
                Utilities.paypad(button.getAttribute("data-id"), this._order);
            });
        });
    }

    info(name) {
        console.log(name)
        // generate restaurant name in each restaurant name class
        document.querySelectorAll(".restaurant-name").forEach(element => {
            element.textContent = name;
        });
    }

    menu(menuInstance, orderInstance) {
        // generate items in menu as figures in menu div
        let frag = document.createDocumentFragment();
        menuInstance.menu.forEach(item => {
            let menuElement = `<img src="${item.image}" alt="${item.description}"
            class="menu-img" style="width: 150px; height: 150px;">
            <figcaption>${item.description}</figcaption>
            <figcaption>${Utilities.floatToString(item.price)}</figcaption>`

            // create figure for menu item
            let node = document.createElement("figure");
            node.className = "menu-item";

            // store item data in menu for easy access
            let dataString = JSON.stringify({ sku : `${item.sku}`, description : `${item.description}`, price : `${item.price}`, taxRate : `${item.taxRate}`})
            node.setAttribute("data-sku", dataString);  // add data to html element
            node.innerHTML = menuElement;
            frag.appendChild(node);
        });
        document.getElementById("menu").appendChild(frag);

        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.selectMenuItem(1, button.getAttribute("data-sku"));
            })
        })
    }

    static invoiceNumber(invoiceNumber) {
        document.getElementById('invoice-number').textContent = `Invoice# ${invoiceNumber}`
    }

    static openTab(tabName) {
        // Declare all variables
        var i, tabcontent, tablinks;

        // Get all elements with class="tab-content" and hide them
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
          tabcontent[i].style.display = "none";
        }

        // Get all elements with class="tab-btn" and remove the class "active"
        tablinks = document.getElementsByClassName("tab-btn");
        for (i = 0; i < tablinks.length; i++) {
          tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        // Show the current tab, and add an "active" class to the button that opened the tab
        const tab = document.getElementById(tabName);
        tab.style.display = "flex";
        tab.className += " active";
    }

    static receiptDetails(orderInstance) {
        // generate lines in the order as rows in receipt-details table body
        let frag = document.createDocumentFragment();
        orderInstance.order.forEach((orderLine, index)  => {
            let receiptLine = `<td class="description">${orderLine.description}</td>
            <td class="quantity">${orderLine.quantity}</td>
            <td class="price">${Utilities.floatToString(orderLine.price)}</td>
            <td class="subtotal">${Utilities.floatToString(orderLine.subtotal)}</td>
            <td class="delete" data-delete="${index.toString()}" ><i class="fa-solid fa-delete-left"></i></td>`

            // create row for order item
            let node = document.createElement("tr");
            node.setAttribute("data-index", `${index.toString()}`);
            node.innerHTML = receiptLine;
            frag.appendChild(node);
        });
        let receiptDetails = document.getElementById("receipt-details");
        while (receiptDetails.hasChildNodes()) {
            receiptDetails.removeChild(receiptDetails.childNodes[0]);
        }
        receiptDetails.appendChild(frag);
        this.summary(orderInstance);

        document.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', () => {
                orderInstance.deleteOrderLine(parseInt(button.getAttribute("data-delete")));
            })
        })
    }

    static summary(orderInstance) {
        // generate summary as values in summary ids
        const summary = orderInstance.getSummary();
        document.getElementById("subtotal-summary").textContent = Utilities.floatToString(summary.subtotal);
        document.getElementById("tax-summary").textContent = Utilities.floatToString(summary.tax);
        document.getElementById("grandtotal-summary").textContent = Utilities.floatToString(summary.grandtotal);
        
    }

    static showPaypad() {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "grid";
    }
    
    static hidePaypad() {
        const paypad = document.getElementById('payment-overlay');
        paypad.style.display = "none";
    }

    static paymentSummary(orderInstance) {
        document.getElementById('amount-paid').textContent = Utilities.floatToString(orderInstance.payment.amountPaid);
        const changeTipTitle = document.getElementById('tip-change-title');
        const paymentType = document.getElementById('payment-type');
        if (orderInstance.payment.type === 'credit') {
            changeTipTitle.textContent = "Tip";
            paymentType.textContent = "CC";
        } else if (orderInstance.payment.type === 'cash') {
            changeTipTitle.textContent = "Change";
            paymentType.textContent = "Cash";
        } else {
            changeTipTitle.textContent = "Change";
            paymentType.textContent = "";           
        }
        document.getElementById('tip-change-value').textContent = Utilities.floatToString(orderInstance.payment.changeTip);
    }

    static closeButton(bool) {
        const closeButton = document.getElementById('close-sale');
        if(bool) {
            closeButton.style.display = 'none';
        } else {
            closeButton.style.display = 'grid';
        }
    }
}

class Utilities {

    static floatToString(float) {
        let priceParams = {
            style: "currency",
            currency: "EUR"
        };
        return float.toLocaleString("de-DE", priceParams);
    }

    static roundToTwo(num) {
        return +(Math.round(num + "e+2") + "e-2");
    }

    static paypad(input, orderInstance) {
        if (!isNaN(parseInt(input))) {
            this.numberPaypad(parseInt(input), orderInstance);
        } else if (input === "back") {
            this.backPaypad(orderInstance);
        } else if (input === "clear") {
            this.clearPaypad(orderInstance);
        } else {
            orderInstance.closeSale();
        }
    }

    static numberPaypad(input, orderInstance) {
        const currentInput = this.roundToTwo(input * 0.01);
        const currentAmoutPaid = this.roundToTwo(orderInstance.payment.amountPaid);
        const newAmountPaid = this.roundToTwo((currentAmoutPaid * 10) + currentInput);
        if (currentAmoutPaid == 0) {
            orderInstance.changePayment({ amountPaid : currentInput});
        } else {
            orderInstance.changePayment( { amountPaid : newAmountPaid});
        }
    }
    
    static backPaypad(orderInstance) {
        const currentPayment = orderInstance.payment.amountPaid;
        if (currentPayment > 0) {
            const toSubtract = ((currentPayment * 100) % 10) * 0.01  // cent amount
            const newAmount = (currentPayment - toSubtract) * 0.1;
            orderInstance.changePayment({ amountPaid : newAmount });
        }
    }

    static clearPaypad(orderInstance) {
        orderInstance.changePayment({ amountPaid : 0});
    }
}
 

// MOCK DATA - simulate getting google sheet data

const menuData = [
    // description, price, tax rate, link to image
    [101, 'Tuna Pasta With Tomato and Olives', 14.00, 0.05, 'https://www.simplyrecipes.com/thmb/o4jzrhkJ4QMKVKBjvh2nCZuryRI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2014__06__tuna-pasta-tomato-olives-vertical-a-1700-3b7f922febf44a40b1765bf0149a21cc.jpg', 'text of receipe 101'],
    [102, 'Tagliatelle with sausage meat bolognese', 12.00, 0.05, 'https://www.simplyrecipes.com/thmb/nQGdcRXq_x4wa3vboPx4r7ZBVPo=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2005__11__Bolognese-Sauce-LEAD-2-8bb9d39957474e3396eab141cce7be90.jpg'],
    [103, 'Tuna Pasta With Tomato and Olives', 14.00, 0.05, 'https://www.simplyrecipes.com/thmb/o4jzrhkJ4QMKVKBjvh2nCZuryRI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2014__06__tuna-pasta-tomato-olives-vertical-a-1700-3b7f922febf44a40b1765bf0149a21cc.jpg'],
    [104, 'Tagliatelle with sausage meat bolognese', 12.00, 0.05, 'https://www.simplyrecipes.com/thmb/nQGdcRXq_x4wa3vboPx4r7ZBVPo=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2005__11__Bolognese-Sauce-LEAD-2-8bb9d39957474e3396eab141cce7be90.jpg'],
    [105, 'Tuna Pasta With Tomato and Olives', 14.00, 0.05, 'https://www.simplyrecipes.com/thmb/o4jzrhkJ4QMKVKBjvh2nCZuryRI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2014__06__tuna-pasta-tomato-olives-vertical-a-1700-3b7f922febf44a40b1765bf0149a21cc.jpg'],
    [106, 'Tagliatelle with sausage meat bolognese', 12.00, 0.05, 'https://www.simplyrecipes.com/thmb/nQGdcRXq_x4wa3vboPx4r7ZBVPo=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2005__11__Bolognese-Sauce-LEAD-2-8bb9d39957474e3396eab141cce7be90.jpg'],
    [107, 'Tuna Pasta With Tomato and Olives', 14.00, 0.05, 'https://www.simplyrecipes.com/thmb/o4jzrhkJ4QMKVKBjvh2nCZuryRI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2014__06__tuna-pasta-tomato-olives-vertical-a-1700-3b7f922febf44a40b1765bf0149a21cc.jpg'],
    [108, 'Tagliatelle with sausage meat bolognese', 12.00, 0.05, 'https://www.simplyrecipes.com/thmb/nQGdcRXq_x4wa3vboPx4r7ZBVPo=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2005__11__Bolognese-Sauce-LEAD-2-8bb9d39957474e3396eab141cce7be90.jpg'],
    [109, 'Tuna Pasta With Tomato and Olives', 14.00, 0.05, 'https://www.simplyrecipes.com/thmb/o4jzrhkJ4QMKVKBjvh2nCZuryRI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2014__06__tuna-pasta-tomato-olives-vertical-a-1700-3b7f922febf44a40b1765bf0149a21cc.jpg'],
    [110, 'Tagliatelle with sausage meat bolognese', 12.00, 0.05, 'https://www.simplyrecipes.com/thmb/nQGdcRXq_x4wa3vboPx4r7ZBVPo=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2005__11__Bolognese-Sauce-LEAD-2-8bb9d39957474e3396eab141cce7be90.jpg'],
    [111, 'Tuna Pasta With Tomato and Olives', 14.00, 0.05, 'https://www.simplyrecipes.com/thmb/o4jzrhkJ4QMKVKBjvh2nCZuryRI=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2014__06__tuna-pasta-tomato-olives-vertical-a-1700-3b7f922febf44a40b1765bf0149a21cc.jpg'],
    [112, 'Tagliatelle with sausage meat bolognese', 12.00, 0.05, 'https://www.simplyrecipes.com/thmb/nQGdcRXq_x4wa3vboPx4r7ZBVPo=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2005__11__Bolognese-Sauce-LEAD-2-8bb9d39957474e3396eab141cce7be90.jpg'],
];

const previousSalesData = [
    // timestamp, invoice number, skew, quantity, subtotal, tax
    ["", 4999, 101.0, 1.0, 10.99, 0.5495],
    ["", 4999, 102.0, 2.00, 7.95, 0.3975],
    ["", 4999, 103.0, 3.0, 8.96, 0.45],
    ["", 5000, 106.0, 1.0, 6.99, 0.35],
    ["", 5000, 107.0, 1.0, 5.95, 0.30],
];

const paymentData = [
    // not read - reference data to show format to write in
    ["", 4999, 56.46, "cc", 5.00],
    ["", 5000, 13.59, "cash", 0],
]

function sheetData() {
    google.script.run.withSuccessHandler(function(dataArray) {
      items = Object.values(dataArray.items);
      sales = dataArray.sales;
      // load menu
      menu.menu = items;
      order.previousSales = sales;
    }).getData();  // run google app script function to get data
}

function mockData() {
    // load mock data
    menu.menu = menuData;
    order.previousSales = previousSalesData;
    order.previousPayments = paymentData;
}

/*
Program starts here
Order has a menu
Recipe has a menu
*/
const menu = new Menu();
const order = new Order();
mockData();  // get restaurant data
order.generateInvoiceNumber();  // instantiate invoice number
const ui = new Ui(menu, order);
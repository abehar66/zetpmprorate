sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/odataModel",
    "sap/m/PDFViewer",
], function (BaseController, JSONModel, formatter, Filter, FilterOperator,odataModel,PDFViewer) { 
    "use strict"; 

    return BaseController.extend("zetpmprorate.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit : function () {
            var oViewModel;

            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
            });
            this.setModel(oViewModel, "worklistView");

            odataModel.init(this);

            this.prorateModel = new JSONModel(
                {                    
                    'ProrateSet': [],                    
                });

            this.expenseModel = new JSONModel(
                {                    
                    'ExpenseSet': [],                    
                });    

            this.prorationModel = new JSONModel(
                {                    
                   'ProrationSet': [],
                   'PartsSet': [], 
                   'ExpenseSet': [],
                   'TraspasoSet' : [], 
                   'ExpedienteSet' : [],
                   'ExpedienteId' : 'Nuevo',
                   'ProrateText' : 'Prorratear',
                   'VisibleDate' : true
                });    
            
            this.parametersModel = new JSONModel(
                {                    
                  'Desde': new Date(),
                  'Hasta': new Date(),                    
                });
       
            
            this.setModel(this.prorateModel, "ProrateModel");    
            this.setModel(this.expenseModel, "ExpenseModel");   
            this.setModel(this.prorationModel, "ProrationModel");
            this.setModel(this.parametersModel, "ParametersModel");

            this.onLoadExpediente( );

        },

        onPrint: function() {
            const oProrationList = this.prorationModel.getProperty('/ProrationSet');             
            const selectedTab =this.getView().byId("iconTabBar").getSelectedKey();
            let expediente = '';
            let id = '';
            let titlePDF = '';
            
            if ( (oProrationList !== undefined) &&
                 (oProrationList.length !== 0) )  {
            expediente = oProrationList[0].ExpedienteId;

            if (selectedTab === 'pieza'){
                id = 'PRORATE';
                titlePDF = this.getView().getModel("i18n").getProperty("reportPartsTitle");
            }

            if (selectedTab === 'traspaso'){
                id = 'TRANSFER';
                titlePDF = this.getView().getModel("i18n").getProperty("reportTransferPartsTitle");
            }    

            if (selectedTab === 'comprobante'){
                id = 'EXPENSE';
                titlePDF = this.getView().getModel("i18n").getProperty("reportExpenseTitle");
            }


            let path = `/sap/opu/odata/sap/ZPM_WEB_FIORI_SRV/FileSet(Id='${id}',RefValue='${expediente}')/$value`;            
            
            this.pdfViewer = new PDFViewer();
            this.pdfViewer.setSource(path);
            this.pdfViewer.setTitle(titlePDF);            
            this.pdfViewer.open();
            }
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        onUpdateFinished2 : function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable2 = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable2.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount2", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle2");
            }
            
            this.getModel("worklistView").setProperty("/worklistTableTitle2", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress : function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack : function() {
            // eslint-disable-next-line fiori-custom/sap-no-history-manipulation, fiori-custom/sap-browser-api-warning
            history.go(-1);
        },


        onSearch : function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("ExpedienteName", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh : function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        onProrate : function () {
            const tablePieza = this.byId("PiezaView--tablePieza");
            const tableComprobante = this.byId("ComprobanteView--tableComprobante");
            const tableTraspaso = this.byId("TraspasoView--tableTraspaso");
            const desde = this.parametersModel.getProperty('/Desde');  
            const hasta = this.parametersModel.getProperty('/Hasta'); 
            let keyExpedienteCombo = this.getView().byId('Expediente').getSelectedKey(); 

            if (keyExpedienteCombo === ''){
                keyExpedienteCombo = 'Nuevo';
            }

            tablePieza.setBusy(true);            
            tableComprobante.setBusy(true);
            odataModel.getListProration(desde,hasta,keyExpedienteCombo)
            .then(oData=>{
                tablePieza.setBusy(false)
                tableComprobante.setBusy(false);                
                let dato = oData.results[0];

                if (dato !== undefined){
                   this.prorationModel.setProperty('/ProrationSet', oData.results);
                   this.prorationModel.setProperty('/PartsSet', dato.ToParts.results);
                   let tabla = this.TotalizePieza(dato);                   
                   tablePieza.getBinding("items").getModel().setProperty("/PartsSet",tabla);   
                   let tablaExpense = this.TotalizeExpense(dato);
                   this.prorationModel.setProperty('/ExpenseSet', tablaExpense);    
                   tableComprobante.getBinding("items").getModel().setProperty("/ExpenseSet",tablaExpense);   
                   let tablaCentro = this.TotalizeCentro(dato);                   
                   this.prorationModel.setProperty('/TraspasoSet', tablaCentro);
                   tableTraspaso.getBinding("items").getModel().setProperty("/TraspasoSet",tablaCentro);  
                   
                   if (keyExpedienteCombo === 'Nuevo'){
                    this.onLoadExpediente( );
                    }

                }              
               else {
                   this.prorationModel.setProperty('/ProrationSet', []);
                   this.prorationModel.setProperty('/PartsSet', []);                                     
                   tablePieza.getBinding("items").getModel().setProperty("/PartsSet",[]);                      
                   this.prorationModel.setProperty('/ExpenseSet', []);    
                   tableComprobante.getBinding("items").getModel().setProperty("/ExpenseSet",[]);                      
                   this.prorationModel.setProperty('/TraspasoSet', []);
                   tableTraspaso.getBinding("items").getModel().setProperty("/TraspasoSet",[]);  
               } 
            })
            .catch(error=>{
                tablePieza.setBusy(false);
                tableComprobante.setBusy(false);
                console.error(error);
            });            
            
        },  

        onProrate1 : function () {
            const tablePieza = this.byId("PiezaView--tablePieza");
            const tableComprobante = this.byId("ComprobanteView--tableComprobante");

            tablePieza.setBusy(true);            
            tableComprobante.setBusy(true);
            odataModel.getListPieza()
            .then(oData=>{
                tablePieza.setBusy(false)
                this.prorateModel.setProperty('/ProrateSet', oData.results);                    
                tablePieza.getBinding("items").getModel().setProperty("/ProrateSet",oData.results);   
                         
            })
            .catch(error=>{
                tablePieza.setBusy(false);
                console.error(error);
            });

            
            odataModel.getListGasto()
            .then(oData=>{
                tableComprobante.setBusy(false)
                this.prorateModel.setProperty('/ExpenseSet', oData.results);    
                tableComprobante.getBinding("items").getModel().setProperty("/ExpenseSet",oData.results);   
                         
            })
            .catch(error=>{
                tableComprobante.setBusy(false);
                console.error(error);
            });
        },  

        onLoadExpediente : function () {
            const comboExpediente = this.getView().byId('Expediente');

             if (comboExpediente !== undefined) {   
                comboExpediente.setBusy(true);
            }   
            
            odataModel.getListMaestros('EXPEDIENTE')
            .then(oData=>{                
                oData.results.unshift({Key:"Nuevo",Value:"Nuevo"});
                this.prorationModel.setProperty('/ExpedienteSet', oData.results); 
                this.prorationModel.setProperty('/ExpedienteId','Nuevo'); 
                                                            
            })
            .catch(error=>{                
                console.error(error);
            });

            if (comboExpediente !== undefined) {   
                comboExpediente.setBusy(false);
            }

        },      

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject : function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getPath().substring("/PartsProrationSet".length)
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function(aTableSearchState) {
            var oTable = this.byId("tablePieza"),
                oViewModel = this.getModel("worklistView"),
                oTable2 = this.byId("tableComprobante");
                if(oTable){
                    oTable.getBinding("items").filter(aTableSearchState, "Application");
                }else if(oTable2){
                    oTable2.getBinding("items").filter(aTableSearchState, "Application");
                }
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        },

        TotalizePieza: function( expediente ) {                      
           const precio_uni = Number.parseFloat(expediente.Precio);
           let results = [];
           
           let Pieza = '';
           let curr = { };
           let Suma = 0;
           let Cant = 0;
           let Total_Precio = 0;
           let Total_Cant = 0;
          

           expediente.ToParts.results.forEach(e => { 

            if ((e.Pieza !== Pieza) && (Suma !== 0))
             {
                curr = Object.assign({} , curr);
                curr.Centro = '';
                curr.Precio = Number.parseFloat(Suma).toFixed(2);
                curr.Cant = Number.parseInt(Cant);
                Suma = 0;
                Cant = 0;                
                results.push(curr);
              }            
                        
            Suma = Suma + Number.parseFloat(e.Precio); 
            Cant = Cant + Number.parseInt(e.Cant);        
            Total_Precio = Total_Precio + Number.parseFloat(e.Precio); 
            Total_Cant = Total_Cant + Number.parseInt(e.Cant);

            Pieza = e.Pieza;            
            curr = e;            
            e.Cant = Number.parseInt(e.Cant);
            e.Precio = '';
            //results.push(e);     

           });

           curr = Object.assign({} , curr);
           curr.Centro = '';
           curr.Precio = Number.parseFloat(Suma).toFixed(2);
           curr.Cant = Number.parseInt(Cant);
           results.push(curr);

           curr = Object.assign({} , curr);
           curr.Centro = '';
           curr.Pieza = 'Total';
           curr.PiezaDesc = '';
           curr.Modelo = '';
           curr.Precio = Number.parseFloat(Total_Precio).toFixed(2);
           curr.Cant = Number.parseInt(Total_Cant);
           results.push(curr);

           
           return results;

        },  

        TotalizeCentro: function( expediente ) {                       
            const precio_uni = Number.parseFloat(expediente.Precio);
            let results = [];            
            let Pieza = '';
            let curr = { };
            let Suma = 0;
            let Cant = 0;
            let Total_Precio = 0;
            let Total_Cant = 0;

            expediente.ToParts.results.sort((a, b) => a.Centro.localeCompare(b.Centro));
           
 
            expediente.ToParts.results.forEach(e => { 
                                      
             Suma = Suma + Number.parseFloat(e.Precio); 
             Cant = Cant + Number.parseInt(e.Cant);                      
             
             results.push(e);     
             curr = e;
 
            }); 
             
            curr = Object.assign({} , curr);
            curr.Centro = 'Total';       
            curr.Pieza = '';     
            curr.PiezaDesc = '';
            curr.Modelo = '';
            curr.Precio = Number.parseFloat(Suma).toFixed(2);
            curr.Cant = Number.parseInt(Cant);
            results.push(curr);
 
            
            return results;
 
         },  

         TotalizeExpense: function( expediente ) {                       
            const precio_uni = Number.parseFloat(expediente.Precio);
            let results = [];
            
            let Cuenta = '';
            let curr = { };
            let Suma = 0;            
            let Total_Gasto = 0;
           
            expediente.ToExpense.results.sort((a, b) => a.Cuenta.localeCompare(b.Cuenta));            
            expediente.ToExpense.results.forEach(e => { 
 
             if ((e.Cuenta !== Cuenta) && (Suma !== 0))
              {
                 curr = Object.assign({} , curr);
                 curr.Orden = '';
                 curr.Gasto = Number.parseFloat(Suma).toFixed(2);                 
                 Suma = 0;                 
                 results.push(curr);
               }            
                         
             Suma = Suma + Number.parseFloat(e.Gasto);                     
             Total_Gasto = Total_Gasto + Number.parseFloat(e.Gasto);              
 
             Cuenta = e.Cuenta;            
             curr = e;                         
             curr.Orden = '';             
             //results.push(e);     
 
            });
 
            curr = Object.assign({} , curr);
            curr.Orden = '';
            curr.Gasto = Number.parseFloat(Suma).toFixed(2);            
            results.push(curr);
 
            curr = Object.assign({} , curr);            
            curr.Cuenta = 'Total';                        
            curr.Gasto = Number.parseFloat(Total_Gasto).toFixed(2);            
            results.push(curr);
             
            return results;
 
         }, 

        ToDecimal: function(valor) { 
          const str = String(valor);
          const arr = str.split(".");
          const ent = parseInt(arr[0]);
          const dec = parseInt(arr[1]);

          const numero = dec * 0.01 + ent;          
          
          return numero;
        },

        onChangeExpediente: function() {
            const tablePieza = this.byId("PiezaView--tablePieza");
            const tableComprobante = this.byId("ComprobanteView--tableComprobante");
            const tableTraspaso = this.byId("TraspasoView--tableTraspaso");

            this.prorationModel.setProperty('/ProrationSet', []);
            this.prorationModel.setProperty('/PartsSet', []);                                     
            tablePieza.getBinding("items").getModel().setProperty("/PartsSet",[]);                      
            this.prorationModel.setProperty('/ExpenseSet', []);    
            tableComprobante.getBinding("items").getModel().setProperty("/ExpenseSet",[]);                      
            this.prorationModel.setProperty('/TraspasoSet', []);
            tableTraspaso.getBinding("items").getModel().setProperty("/TraspasoSet",[]);  

            if (this.prorationModel.getProperty('/ExpedienteId') === 'Nuevo'){
                this.prorationModel.setProperty('/ProrateText','Prorratear'); 
                this.prorationModel.setProperty('/VisibleDate',true);
            }
            else {
                this.prorationModel.setProperty('/ProrateText','Mostrar');
                this.prorationModel.setProperty('/VisibleDate',false);
            }   

        },     
    });
});

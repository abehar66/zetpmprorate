sap.ui.define([
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Filter',   
    
],
    /**
     * provide app-view type models (as in the first "V" in MVVC)
     * 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.Device} Device
     * 
     * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
     */
    function (FilterOperator, Filter) {
        "use strict";

        const maestroEntity = '/MaestroSet';        
        const prorateEntity = '/ProrationSet';
        const expenseEntity = '/ExpenseProrationSet';
        const authorityEntity = '/AuthoritySet';        
        const orderEntity = '/OrderProrateSet';        
        
        return {
            init: function (caller) {
                this.caller = caller;
                this.odataModel = caller.getOwnerComponent().getModel();

                try {
                    this.UserId = sap.ushell.Container.getService("UserInfo").getId();
                } catch (e) {
                    this.UserId = 'ESP_RICCARDO';
                }

            },

            getListGasto: function () {               

                return new Promise(function (resolve, reject) {

                    this.odataModel.read(expenseEntity, {
                        filters: null,
                        success: oData => {
                            resolve(oData)
                        },
                        error: e => {
                            reject(e)
                        }
                    });
                }.bind(this))

            },            

            getListPieza: function () {
                
                return new Promise(function (resolve, reject) {

                    this.odataModel.read(prorateEntity, {
                        filters: null,
                        success: oData => {
                            resolve(oData)
                        },
                        error: e => {
                            reject(e)
                        }
                    });
                }.bind(this))

            }, 
            
            getListProration : function (desde , hasta, expediente = 'Nuevo') {
                const sUrlParameters = '$expand=ToExpense,ToParts';   
                
                let Filters = [
                    new Filter({
                        path: 'Desde',
                        operator: FilterOperator.EQ,
                        value1: desde
                    }),
                    new Filter({
                        path: 'Hasta',
                        operator: FilterOperator.EQ,
                        value1: hasta
                    }),
                    new Filter({
                        path: 'ExpedienteName',
                        operator: FilterOperator.EQ,
                        value1: expediente
                    }),
                ];
                
                return new Promise(function (resolve, reject) {

                    this.odataModel.read(prorateEntity, {
                        urlParameters: sUrlParameters,
                        filters: Filters,
                        success: oData => {
                            resolve(oData)
                        },
                        error: e => {
                            reject(e)
                        }
                    });
                }.bind(this))

            },
                        
            getListMaestros: function (maestro, RefData = null) {

                let Filters = [
                    new Filter({
                        path: 'Maestro',
                        operator: FilterOperator.EQ,
                        value1: maestro
                    }),
                    new Filter({
                        path: 'Usuario',
                        operator: FilterOperator.EQ,
                        value1: this.UserId
                    }),
                ];

                if (RefData != null) {

                    const f = new Filter({
                        filters: [
                            new Filter({
                                path: 'RefValue',
                                operator: FilterOperator.EQ,
                                value1: RefData
                            }),

                        ],
                        and: true
                    });
                    Filters.push(f);
                }

                return new Promise(function (resolve, reject) {

                    this.odataModel.read(maestroEntity, {
                        filters: Filters,
                        success: oData => {
                            resolve(oData)
                        },
                        error: e => {
                            reject(e)
                        }
                    });
                }.bind(this))

            },
                        
            getAppAuthority: function (AppEstado, Number) {
                let Filters = [
                    new Filter({
                        path: 'AppEstado',
                        operator: FilterOperator.EQ,
                        value1: AppEstado
                    }),

                    new Filter({
                        path: 'Usuario',
                        operator: FilterOperator.EQ,
                        value1: this.UserId
                    }),
                ];

                if (Number !== undefined) {
                    Filters.push(new Filter({
                        path: 'Order',
                        operator: FilterOperator.EQ,
                        value1: Number
                    }));
                }


                return new Promise(function (resolve, reject) {

                    this.odataModel.read(authorityEntity, {
                        filters: Filters,
                        success: oData => {
                            resolve(oData)
                        },
                        error: e => {
                            reject(e)
                        }
                    });
                }.bind(this))
            },

            getListOrders : function (idtaller=1) {

                let Filters = [
                    new Filter({
                        path: 'Taller',
                        operator: FilterOperator.EQ,
                        value1: idtaller
                    })                    
                ];

                
                return new Promise(function (resolve, reject) {

                    this.odataModel.read(orderEntity, {                        
                        filters: Filters,
                        success: oData => {
                            resolve(oData)
                        },
                        error: e => {
                            reject(e)
                        }
                    });
                }.bind(this))

            },

            
        }
    });



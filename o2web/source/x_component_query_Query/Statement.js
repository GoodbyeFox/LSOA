MWF.xApplication.query = MWF.xApplication.query || {};
MWF.xApplication.query.Query = MWF.xApplication.query.Query || {};
MWF.xDesktop.requireApp("query.Query", "Viewer", null, false);

MWF.xApplication.query.Query.Statement = MWF.QStatement = new Class({
    Extends: MWF.QViewer,
    options: {
        "lazy": false,
        "moduleEvents": ["queryLoad", "postLoad", "postLoadPageData", "postLoadPage", "selectRow", "unselectRow",
            "queryLoadItemRow", "postLoadItemRow", "queryLoadCategoryRow", "postLoadCategoryRow", "export", "exportRow"]
    },
    initialize: function (container, json, options, app, parentMacro) {
        //本类有三种事件，
        //一种是通过 options 传进来的事件，包括 loadView、openDocument、select、unselect
        //一种是用户配置的 事件， 在this.options.moduleEvents 中定义的作为类事件
        //还有一种也是用户配置的事件，不在this.options.moduleEvents 中定义的作为 this.node 的DOM事件

        this.setOptions(options);

        this.path = "../x_component_query_Query/$Viewer/";
        this.cssPath = "../x_component_query_Query/$Viewer/" + this.options.style + "/css.wcss";
        this._loadCss();
        this.lp = MWF.xApplication.query.Query.LP;

        this.app = app;

        this.container = $(container);

        this.json = json || {};

        this.parentMacro = parentMacro;

        this.originalJson = Object.clone(json);

        this.viewJson = null;
        this.filterItems = [];
        this.searchStatus = "none"; //none, custom, default


        this.items = [];
        this.selectedItems = [];
        this.hideColumns = [];
        this.openColumns = [];
        this.parameter = {};

        this.gridJson = null;

        if (this.options.isload) {
            this.init(function () {
                this.load();
            }.bind(this));
        }

    },
    init: function (callback) {
        if (this.json.view && this.json.format) {
            this.viewJson = JSON.decode(this.json.view);
            this.statementJson = this.json;
            this.statementJson.viewJson = this.viewJson;
            if (callback) callback();
        } else {
            this.getView(callback);
        }
    },
    loadMacro: function (callback) {
        MWF.require("MWF.xScript.Macro", function () {
            this.Macro = new MWF.Macro.ViewContext(this);
            if (callback) callback();
        }.bind(this));
    },
    createActionbarNode: function () {
        this.actionbarAreaNode.empty();
        if (typeOf(this.json.showActionbar) === "boolean" && this.json.showActionbar !== true) return;
        if (typeOf(this.viewJson.actionbarHidden) === "boolean") {
            if (this.viewJson.actionbarHidden === true || !this.viewJson.actionbarList || !this.viewJson.actionbarList.length) return;
            this.actionbar = new MWF.xApplication.query.Query.Statement.Actionbar(this.actionbarAreaNode, this.viewJson.actionbarList[0], this, {});
            this.actionbar.load();
        }
    },
    _loadPageNode: function () {
        this.viewPageAreaNode.empty();
        if( this.viewJson.pagingbarHidden === true ){
            return;
        }
        if (!this.paging) {
            var json;
            if (!this.viewJson.pagingList || !this.viewJson.pagingList.length) {
                json = {
                    "firstPageText": this.lp.firstPage,
                    "lastPageText": this.lp.lastPage
                };
            } else {
                json = this.viewJson.pagingList[0];
            }
            this.paging = new MWF.xApplication.query.Query.Statement.Paging(this.viewPageAreaNode, json, this, {});
            this.paging.load();
        } else {
            this.paging.reload();
        }
    },
    // _initPage: function(){
    //     var i = this.count/this.json.pageSize;
    //     this.pages = (i.toInt()<i) ? i.toInt()+1 : i;
    //     this.currentPage = this.options.defaultPage || 1;
    //     this.options.defaultPage = null;
    // },
    lookup: function (data, callback) {
        if (this.lookuping) return;
        this.lookuping = true;
        // this.getLookupAction(function(){
        //     if (this.json.application){

        var d = Object.clone( data || {} );
        // d.count = this.json.count;
        // this.lookupAction.bundleView(this.json.id, d, function(json){
        //     this.bundleItems = json.data.valueList;

        // this._initPage();

        debugger;
        this.loadParameter(d);
        this.loadFilter(d);

        this.currentPage = this.options.defaultPage || 1;
        this.options.defaultPage = null;

        if (this.noDataTextNode) this.noDataTextNode.destroy();
        this.loadCurrentPageData(function (json) {
            if (this.count || (json.data && json.data.length )) {
                this.fireEvent("postLoad"); //用户配置的事件
                this.lookuping = false;
                if (callback) callback(this);
            } else {
                this.viewPageAreaNode.empty();
                if (this.viewJson.noDataText) {
                    var noDataTextNodeStyle = this.css.noDataTextNode;
                    if (this.viewJson.viewStyles && this.viewJson.viewStyles["noDataTextNode"]) {
                        noDataTextNodeStyle = this.viewJson.viewStyles["noDataTextNode"];
                    }
                    this.noDataTextNode = new Element("div", {
                        "styles": noDataTextNodeStyle,
                        "text": this.viewJson.noDataText
                    }).inject(this.contentAreaNode);
                }
                // if (this.loadingAreaNode){
                //     this.loadingAreaNode.destroy();
                //     this.loadingAreaNode = null;
                // }
                this.fireEvent("postLoad"); //用户配置的事件
                this.lookuping = false;
                if (callback) callback(this);
            }


        }.bind(this), true, "all");

        // }.bind(this));
        // }
        // }.bind(this));
    },
    loadFilter: function (data) {
        debugger;
        this.filterList = [];
        (data.filterList || []).each(function (d) {
            var pName = d.path.replace(/\./g, "_");

            var parameterName = pName;
            var suffix = 1;
            while( this.parameter[parameterName] ){
                parameterName = pName + "_" + suffix;
                suffix++;
            }

            var value = d.value;
            // if( d.code && d.code.code ){
            //     value = this.Macro.exec( d.code.code, this);
            // }
            if (d.comparison === "like" || d.comparison === "notLike") {
                if (value.substr(0, 1) !== "%") value = "%" + value;
                if (value.substr(value.length - 1, 1) !== "%") value = value + "%";
                this.parameter[parameterName] = value; //"%"+value+"%";
            } else {
                if( ["sql", "sqlScript"].contains(this.statementJson.format) ){
                    if (d.formatType === "numberValue"){
                        value = parseFloat(value);
                    }
                }else{
                    if (d.formatType === "dateTimeValue" || d.formatType === "datetimeValue") {
                        value = "{ts '" + value + "'}"
                    } else if (d.formatType === "dateValue") {
                        value = "{d '" + value + "'}"
                    } else if (d.formatType === "timeValue") {
                        value = "{t '" + value + "'}"
                    } else if (d.formatType === "numberValue"){
                        value = parseFloat(value);
                    }
                }
                this.parameter[parameterName] = value;
            }
            d.value = parameterName;

            if( !d.logic )d.logic = "and";

            this.filterList.push(d);
        }.bind(this))
    },
    loadParameter: function () {
        this.parameter = {};
        debugger;
        var parameter = this.json.parameter ? Object.clone(this.json.parameter) : {};
        //系统默认的参数
        (this.viewJson.parameterList || []).each(function (f) {
            var value = f.value;
            if (parameter && parameter[f.parameter]) {
                value = parameter[f.parameter];
                delete parameter[f.parameter];
            }
            if (typeOf(value) === "date") {
                value = value.format("db");
            }
            if (f.valueType === "script") {
                value = this.Macro.exec(f.valueScript ? f.valueScript.code : "", this);
            } else {
                var user = layout.user;
                switch (f.value) {
                    case "@person":
                        // value = user.distinguishedName;
                        value = "";
                        break;
                    case "@identityList":
                        // value = user.identityList.map(function (d) {
                        //     return d.distinguishedName;
                        // });
                        value = "";
                        break;
                    case "@unitList":
                        // o2.Actions.load("x_organization_assemble_express").UnitAction.listWithPerson({"personList": [user.distinguishedName]}, function (json) {
                        //     value = json.unitList;
                        // }, null, false);
                        value = "";
                        break;
                    case "@unitAllList":
                        // o2.Actions.load("x_organization_assemble_express").UnitAction.listWithIdentitySupNested({"personList": [user.distinguishedName]}, function (json) {
                        //     value = json.unitList;
                        // }, null, false);
                        value = "";
                        break;
                    case "@year":
                        value = (new Date().getFullYear()).toString();
                        break;
                    case "@season":
                        var m = new Date().format("%m");
                        if (["01", "02", "03"].contains(m)) {
                            value = "1"
                        } else if (["04", "05", "06"].contains(m)) {
                            value = "2"
                        } else if (["07", "08", "09"].contains(m)) {
                            value = "3"
                        } else {
                            value = "4"
                        }
                        break;
                    case "@month":
                        value = new Date().format("%Y-%m");
                        break;
                    case "@time":
                        value = new Date().format("db");
                        break;
                    case "@date":
                        value = new Date().format("%Y-%m-%d");
                        break;
                    default:
                }
            }
            if( !["sql", "sqlScript"].contains(this.statementJson.format) ) {
                if (f.formatType === "dateTimeValue" || f.formatType === "datetimeValue") {
                    value = "{ts '" + value + "'}"
                } else if (f.formatType === "dateValue") {
                    value = "{d '" + value + "'}"
                } else if (f.formatType === "timeValue") {
                    value = "{t '" + value + "'}"
                }
            }
            this.parameter[f.parameter] = value;
        }.bind(this));
        //传入的参数
        for (var p in parameter) {
            var value = parameter[p];
            if (typeOf(value) === "date") {
                if( ["sql", "sqlScript"].contains(this.statementJson.format) ){
                    value = value.format("db");
                }else{
                    value = "{ts '" + value.format("db") + "'}"
                }
            }
            this.parameter[p] = value;
        }
    },
    loadCurrentPageData: function (callback, async, type) {
        //是否需要在翻页的时候清空之前的items ?

        debugger;

        if (this.pageloading) return;
        this.pageloading = true;

        if( this.io ){
            this.items.each(function(item){
                this.io.unobserve(item.node);
            }.bind(this))
        }

        this.items = [];

        var p = this.currentPage;
        var d = {
            "filterList": this.filterList,
            "parameter": this.parameter
        };

        while (this.viewTable.rows.length > 1) {
            this.viewTable.deleteRow(-1);
        }
        if( this.viewTable.rows.length>0 && !this.viewTable.rows[0].hasClass("viewTitleLine") ){
            this.viewTable.deleteRow(0);
        }

        this.contentAreaNode.scrollTo(0, 0);

        //this.createLoadding();

        this.loadViewRes = o2.Actions.load("x_query_assemble_surface").StatementAction.executeV2(
            this.options.statementId || this.options.statementName || this.options.statementAlias ||
            this.json.statementId || this.json.statementName || this.json.statementAlias,
            type || "data", p, this.json.pageSize, d, function (json) {

                if (type === "all" || type === "count") {
                    if (typeOf(json.count) === "number") {
                        this.count = json.count;
                        var i = this.count / this.json.pageSize;
                        this.pages = (i.toInt() < i) ? i.toInt() + 1 : i;
                    }
                }

                this.gridJson = json.data;
                this.setSelectedableFlag();

                this.fireEvent("postLoadPageData");

                // if (this.viewJson.group.column){
                //     this.gridJson = json.data.groupGrid;
                // }else{
                //     this.gridJson = json.data.grid;
                this.loadData();
                // }
                if (this.gridJson.length) this._loadPageNode();
                if (this.loadingAreaNode) {
                    this.loadingAreaNode.destroy();
                    this.loadingAreaNode = null;
                }

                this.pageloading = false;

                this.fireEvent("loadView"); //options 传入的事件
                this.fireEvent("postLoadPage");

                if (callback) callback(json);
            }.bind(this), null, async === false ? false : true);
    },
    getView: function (callback) {
        this.getViewRes = o2.Actions.load("x_query_assemble_surface").StatementAction.get(
            this.json.statementId || this.json.statementName || this.json.statementAlias,
            function (json) {
                debugger;
                var viewData = JSON.decode(json.data.view);
                if (!this.json.pageSize) this.json.pageSize = viewData.pageSize || "20";
                this.viewJson = viewData.data;
                this.json.application = json.data.query;
                //this.json = Object.merge(this.json, json.data);
                this.statementJson = json.data;
                this.statementJson.viewJson = this.viewJson;
                if (callback) callback();
            }.bind(this)
        );
    },

    loadData: function () {
        if (this.getSelectFlag() === "multi" && this.viewJson.allowSelectAll) {
            if (this.selectTitleCell && this.selectTitleCell.retrieve("selectAllLoaded")) {
                this.setUnSelectAllStyle();
            } else {
                this.createSelectAllNode();
            }
        } else if (this.selectAllNode) {
            this.clearSelectAllStyle();
        }

        if (this.gridJson.length) {
            // if( !this.options.paging ){
            this.gridJson.each(function (line, i) {
                this.items.push(new MWF.xApplication.query.Query.Statement.Item(this, line, null, i, null, this.options.lazy));
            }.bind(this));
            // }else{
            //     this.loadPaging();
            // }
        } else {
            if (this.viewPageAreaNode) this.viewPageAreaNode.empty();
        }
    },
    loadDataByPaging: function () {
        if (this.isItemsLoading) return;
        if (!this.isItemsLoaded) {
            var from = Math.min(this.pageNumber * this.options.perPageCount, this.gridJson.length);
            var to = Math.min((this.pageNumber + 1) * this.options.perPageCount + 1, this.gridJson.length);
            this.isItemsLoading = true;
            for (var i = from; i < to; i++) {
                this.items.push(new MWF.xApplication.query.Query.Statement.Item(this, this.gridJson[i], null, i, null, this.options.lazy));
            }
            this.isItemsLoading = false;
            this.pageNumber++;
            if (to == this.gridJson.length) this.isItemsLoaded = true;
        }
    },
    getFilter: function () {
        var filterData = [];
        if (this.searchStatus === "custom") {
            if (this.filterItems.length) {
                this.filterItems.each(function (filter) {
                    if( !filter.data.logic )filter.data.logic = "and";
                    filterData.push(filter.data);
                }.bind(this));
            }
        }
        if (this.searchStatus === "default") {
            var key = this.viewSearchInputNode.get("value");
            if (key && key !== this.lp.searchKeywork) {
                this.viewJson.customFilterList.each(function (entry) {
                    if (entry.formatType === "textValue") {
                        var d = {
                            "path": entry.path,
                            "value": key,
                            "formatType": entry.formatType,
                            "logic": "or",
                            "comparison": "like"
                        };
                        filterData.push(d);
                    }
                    if (entry.formatType === "numberValue") {
                        var v = key.toFloat();
                        if (!isNaN(v)) {
                            var d = {
                                "path": entry.path,
                                "value": v,
                                "formatType": entry.formatType,
                                "logic": "or",
                                "comparison": "like"
                            };
                            filterData.push(d);
                        }
                    }
                }.bind(this));
            }
        }
        return (filterData.length) ? filterData : null;
    },
    viewSearchCustomAddToFilter: function () {
        var pathIdx = this.viewSearchCustomPathListNode.selectedIndex;
        var comparisonIdx = this.viewSearchCustomComparisonListNode.selectedIndex;
        if (pathIdx === -1) {
            MWF.xDesktop.notice("error", {
                "x": "left",
                "y": "top"
            }, this.lp.filterErrorTitle, this.viewSearchCustomPathListNode, {"x": 0, "y": 85});
            return false;
        }
        if (comparisonIdx === -1) {
            MWF.xDesktop.notice("error", {
                "x": "left",
                "y": "top"
            }, this.lp.filterErrorComparison, this.viewSearchCustomComparisonListNode, {"x": 0, "y": 85});
            return false;
        }
        var pathOption = this.viewSearchCustomPathListNode.options[pathIdx];
        var entry = pathOption.retrieve("entry");
        if (entry) {
            var pathTitle = entry.title;
            var path = entry.path;
            var comparison = this.viewSearchCustomComparisonListNode.options[comparisonIdx].get("value");
            var comparisonTitle = this.viewSearchCustomComparisonListNode.options[comparisonIdx].get("text");
            var value = "";

            if (entry.valueType === "script" && entry.valueScript && entry.valueScript.code) {
                var idx = this.viewSearchCustomValueNode.selectedIndex;
                if (idx !== -1) {
                    var v = this.viewSearchCustomValueNode.options[idx].get("value");
                    value = entry.formatType === "booleanValue" ? (v === "true") : v;
                }
            } else {
                switch (entry.formatType) {
                    case "numberValue":
                        value = this.viewSearchCustomValueNode.get("value");
                        break;
                    case "dateTimeValue":
                        value = this.viewSearchCustomValueNode.get("value");
                        break;
                    case "booleanValue":
                        var idx = this.viewSearchCustomValueNode.selectedIndex;
                        if (idx !== -1) {
                            var v = this.viewSearchCustomValueNode.options[idx].get("value");
                            value = (v === "true");
                        }
                        break;
                    default:
                        value = this.viewSearchCustomValueNode.get("value");
                }
            }

            if (value === "") {
                MWF.xDesktop.notice("error", {
                    "x": "left",
                    "y": "top"
                }, this.lp.filterErrorValue, this.viewSearchCustomValueContentNode, {"x": 0, "y": 85});
                return false;
            }

            this.filterItems.push(new MWF.xApplication.query.Query.Statement.Filter(this, {
                "logic": "and",
                "path": path,
                "title": pathTitle,
                "comparison": comparison,
                "comparisonTitle": comparisonTitle,
                "value": value,
                "formatType": (entry.formatType == "datetimeValue") ? "dateTimeValue" : entry.formatType
            }, this.viewSearchCustomFilterContentNode));

            this.searchCustomView();
        }
    },
    searchView: function(){
        debugger;
        if (this.viewJson.customFilterList) {
            var key = this.viewSearchInputNode.get("value");
            if (key && key !== this.lp.searchKeywork) {
                var filterData = [];
                this.filterItems = [];
                this.viewJson.customFilterList.each(function (entry) {
                    if (entry.formatType === "textValue") {
                        var d = {
                            "path": entry.path,
                            "value": key,
                            "formatType": entry.formatType,
                            "logic": "or",
                            "comparison": "like"
                        };
                        filterData.push(d);
                        this.filterItems.push({"data":d});
                    }
                    if (entry.formatType === "numberValue") {
                        var v = key.toFloat();
                        if (!isNaN(v)) {
                            var d = {
                                "path": entry.path,
                                "value": v,
                                "formatType": entry.formatType,
                                "logic": "or",
                                "comparison": "equals"
                            };
                            filterData.push(d);
                            this.filterItems.push({"data":d});
                        }
                    }
                }.bind(this));

                if( this.json.filter ){
                    this.json.filter.clone().each(function(f){
                        filterData.push(f);
                    })
                }

                this.createViewNode({"filterList": filterData});
            }else{
                this.filterItems = [];
                var filterData = this.json.filter ? this.json.filter.clone() : [];
                this.createViewNode( {"filterList": filterData} );
            }
        }
    },
    //搜索相关结束
    getStatementInfor: function () {
        debugger;
        return this.statementJson;
    },
    getPageInfor: function () {
        return {
            pages: this.pages,
            perPageCount: this.json.pageSize,
            currentPageNumber: this.currentPage
        };
    },
    switchStatement: function (json) {
        this.switchView(json);
    },
    setFilter: function (filter, parameter, callback) {
        if (this.lookuping || this.pageloading) return;
        if (!filter) filter = [];
        if (!parameter) parameter = {};
        this.json.filter = filter;
        this.json.parameter = parameter;
        if (this.viewAreaNode) {
            this.createViewNode({"filterList": this.json.filter.clone()}, callback);
        }
    },

    getExportTotalCount: function(){
        return this.count || 100000;
    },
    // getExportMaxCount: function(){
    //     return 2000;
    // },
    exportView: function(){
        var _self = this;
        var total = this.getExportTotalCount();

        var lp = this.lp.viewExport;
        var node = this.exportExcelDlgNode = new Element("div");
        var html = "<div style=\"line-height: 30px; height: 30px; color: #333333; overflow: hidden;margin-top:20px;\">" + lp.exportRange + "：" +
            "   <input class='start' value='" + ( this.exportExcelStart || 1) +  "'><span>"+ lp.to +"</span>" +
            "   <input class='end' value='"+ ( this.exportExcelEnd || total ) +"' ><span>"+lp.item+"</span>" +
            "</div>";
        html += "<div style=\"clear:both; max-height: 300px; margin-bottom:10px; margin-top:10px; overflow-y:auto;\">"+( lp.description.replace("{count}", total ))+"</div>";
        node.set("html", html);
        var check = function () {
            if(this.value.length == 1){
                this.value = this.value.replace(/[^1-9]/g,'');
            }else{
                this.value = this.value.replace(/\D/g,'');
            }
            if( this.value.toInt() > total ){
                this.value = total;
            }
        }
        node.getElement(".start").addEvent( "keyup", function(){ check.call(this) } );
        node.getElement(".end").addEvent( "keyup", function(){ check.call(this) } );


        var dlg = o2.DL.open({
            "title": this.lp.exportExcel,
            "style": "user",
            "isResize": false,
            "content": node,
            "width": 600,
            "height" : 260,
            "buttonList": [
                {
                    "type": "ok",
                    "text": MWF.LP.process.button.ok,
                    "action": function (d, e) {
                        var start = node.getElement(".start").get("value");
                        var end = node.getElement(".end").get("value");
                        if( !start || !end ){
                            MWF.xDesktop.notice("error", {"x": "left", "y": "top"}, lp.inputIntegerNotice, node, {"x": 0, "y": 85});
                            return false;
                        }
                        start = Math.max(start.toInt(), 1);
                        end = end.toInt();
                        if( end < start ){
                            MWF.xDesktop.notice("error", {"x": "left", "y": "top"}, lp.startLargetThanEndNotice, node, {"x": 0, "y": 85});
                            return false;
                        }
                        debugger;
                        this.exportExcelStart = start;
                        this.exportExcelEnd = end;
                        this._exportView(start, end);
                        dlg.close();
                    }.bind(this)
                },
                {
                    "type": "cancel",
                    "text": MWF.LP.process.button.cancel,
                    "action": function () { dlg.close(); }
                }
            ]
        });
    },
    // exportView: function(){
    //     var excelName = this.statementJson.name;
    //
    //     var p = this.currentPage;
    //     var d = {
    //         "filterList": this.filterList,
    //         "parameter": this.parameter
    //     };
    //
    //     this.createLoadding();
    //
    //     debugger;
    //
    //     var exportArray = [];
    //
    //     var titleArray = [];
    //     var colWidthArr = [];
    //     var dateIndexArray = [];
    //     var numberIndexArray = [];
    //     var idx = 0;
    //     Object.each(this.entries, function (c, k) {
    //         if (this.hideColumns.indexOf(k) === -1 && c.exportEnable !== false) {
    //             titleArray.push(c.displayName);
    //             colWidthArr.push(c.exportWidth || 200);
    //             if( c.isTime )dateIndexArray.push(idx);
    //             if( c.isNumber )numberIndexArray.push(idx);
    //             idx++;
    //         }
    //     }.bind(this));
    //     exportArray.push(titleArray);
    //
    //     o2.Actions.load("x_query_assemble_surface").StatementAction.executeV2(
    //         this.options.statementId || this.options.statementName || this.options.statementAlias ||
    //         this.json.statementId || this.json.statementName || this.json.statementAlias,
    //         "data", 1, 100000, d, function (json) {
    //
    //             json.data.each(function (d, i) {
    //                 var dataArray = [];
    //                 Object.each(this.entries, function (c, k) {
    //                     if (this.hideColumns.indexOf(k) === -1 && c.exportEnable !== false) {
    //                         var text = this.getExportText(c, k, d);
    //                         // if( c.isNumber && typeOf(text) === "string" && (parseFloat(text).toString() !== "NaN") ){
    //                         //     text = parseFloat(text);
    //                         // }
    //                         dataArray.push( text );
    //                     }
    //                 }.bind(this));
    //                 //exportRow事件
    //                 var argu = {"index":i, "source": d, "data":dataArray};
    //                 this.fireEvent("exportRow", [argu]);
    //                 exportArray.push( argu.data || dataArray );
    //             }.bind(this));
    //
    //             //export事件
    //             var arg = {
    //                 data : exportArray,
    //                 colWidthArray : colWidthArr,
    //                 title : excelName
    //             };
    //             this.fireEvent("export", [arg]);
    //
    //             if (this.loadingAreaNode) {
    //                 this.loadingAreaNode.destroy();
    //                 this.loadingAreaNode = null;
    //             }
    //
    //             new MWF.xApplication.query.Query.Statement.ExcelUtils().exportToExcel(
    //                 arg.data || exportArray,
    //                 arg.title || excelName,
    //                 arg.colWidthArray || colWidthArr,
    //                 dateIndexArray,  //日期格式列下标
    //                 numberIndexArray  //数字格式列下标
    //             );
    //
    //         }.bind(this));
    // },
    _exportView: function(start, end){
        var excelName = this.statementJson.name;

        var p = this.currentPage;
        var d = {
            "filterList": this.filterList,
            "parameter": this.parameter
        };

        this.createLoadding();

        var exportArray = [];

        var titleArray = [];
        var colWidthArr = [];
        var dateIndexArray = [];
        var numberIndexArray = [];
        var idx = 0;
        Object.each(this.entries, function (c, k) {
            if (this.hideColumns.indexOf(k) === -1 && c.exportEnable !== false) {
                titleArray.push(c.displayName);
                colWidthArr.push(c.exportWidth || 200);
                if( c.isTime )dateIndexArray.push(idx);
                if( c.isNumber )numberIndexArray.push(idx);
                idx++;
            }
        }.bind(this));
        exportArray.push(titleArray);

        this.loadExportData(start, end, d, function (dataList) {
            var index = 0;
            dataList.each(function (data, j) {
                data.each(function (d, i) {
                    index = index + 1;
                    var dataArray = [];
                    Object.each(this.entries, function (c, k) {
                        if (this.hideColumns.indexOf(k) === -1 && c.exportEnable !== false) {
                            var text = this.getExportText(c, k, d);
                            // if( c.isNumber && typeOf(text) === "string" && (parseFloat(text).toString() !== "NaN") ){
                            //     text = parseFloat(text);
                            // }
                            dataArray.push( text );
                        }
                    }.bind(this));
                    //exportRow事件
                    var argu = {"index":index, "source": d, "data":dataArray};
                    this.fireEvent("exportRow", [argu]);
                    exportArray.push( argu.data || dataArray );
                }.bind(this));
            }.bind(this));

            //export事件
            var arg = {
                data : exportArray,
                colWidthArray : colWidthArr,
                title : excelName
            };
            this.fireEvent("export", [arg]);

            if (this.loadingAreaNode) {
                this.loadingAreaNode.destroy();
                this.loadingAreaNode = null;
            }

            new MWF.xApplication.query.Query.Statement.ExcelUtils().exportToExcel(
                arg.data || exportArray,
                arg.title || excelName,
                arg.colWidthArray || colWidthArr,
                dateIndexArray,  //日期格式列下标
                numberIndexArray  //数字格式列下标
            );

        }.bind(this))
    },
    loadExportData: function(start, end, body, callback){
        start = start - 1;
        var differ = end - start;
        var count;
        // if( differ < 10 ){
        //    count = 10;
        // }else if( differ < 100 ){
        //     count = 100;
        // }else if( differ < 1000 ){
        //     count = 1000;
        // }else{
        //     count = 10000; bai boi bai boy buy boy
        // }
        if( differ < 10000 ){
            count = differ;
        }else{
            count = 10000;
        }
        var page = Math.floor( start / count ) + 1;
        var startIndex = start % count;
        var endIndex = end % count;
        var loaded = (page - 1)*count;
        var list = [];
        do{
            var promise = o2.Actions.load("x_query_assemble_surface").StatementAction.executeV2(
                this.options.statementId || this.options.statementName || this.options.statementAlias ||
                this.json.statementId || this.json.statementName || this.json.statementAlias,
                "data", page, count, body);
            list.push(promise);
            loaded = loaded + count;
            page = page + 1;
        }while( end > loaded );
        var result = [];
        Promise.all( list ).then(function (arr) {
            arr.each(function (json, i) {
                var data = json.data;
                var length = json.data.length;
                if( i === 0 && i === list.length - 1 ){
                    data.splice( 0, startIndex );
                    if( length > endIndex && endIndex > 0 ){
                        data.splice( endIndex - startIndex , length - endIndex );
                    }
                }else if( i === 0 ){
                    data.splice( 0, startIndex );
                }else if( i=== list.length - 1 ){
                    if( length > endIndex && endIndex > 0 )data.splice( endIndex, length - endIndex );
                }
                result.push(data);
            });
            if( callback )callback(result);
        });

    },
    getDataByPath: function (obj, path) {
        var pathList = path.split(".");
        for (var i = 0; i < pathList.length; i++) {
            var p = pathList[i];
            if ((/(^[1-9]\d*$)/.test(p))) p = p.toInt();
            if (obj[p]) {
                obj = obj[p];
            } else if(obj[p] === undefined || obj[p] === null) {
                obj = "";
                break;
            } else {
                obj = obj[p];
                break;
            }
        }
        return obj
    },
    getExportText: function (c, k, data) {
        var path = c.path, code = c.code, obj = data;
        if (!path) {
            return ""
        } else if (path === "$all") {
        } else {
            obj = this.getDataByPath(obj, path);
        }

        try{
            if (code && code.trim()) obj = this.view.Macro.exec(code, {
                "value": obj,
                "data": data,
                "entry": c,
                "json": c
            });
        }catch (e) {}

        var toName = function (value) {
            if (typeOf(value) === "array") {
                Array.each(value, function (v, idx) {
                    value[idx] = toName(v)
                })
            } else if (typeOf(value) === "object") {
                Object.each(value, function (v, key) {
                    value[key] = toName(v);
                })
            } else if (typeOf(value) === "string") {
                value = o2.name.cn(value)
            }
            return value;
        };

        var d;
        if (obj != undefined && obj != null) {
            if (typeOf(obj) === "array") {
                d = c.isName ? JSON.stringify(toName(Array.clone(obj))) : JSON.stringify(obj);
            } else if (typeOf(obj) === "object") {
                d = c.isName ? JSON.stringify(toName(Object.clone(obj))) : JSON.stringify(obj);
            } else {
                d = c.isName ? o2.name.cn(obj.toString()) : obj;
            }
        }
        return d;
    }
});

MWF.xApplication.query.Query.Statement.Item = new Class({
    Extends: MWF.xApplication.query.Query.Viewer.Item,
    initialize: function (view, data, prev, i, category, lazy) {
        this.view = view;
        this.data = data;
        this.dataString = JSON.stringify(data);
        this.css = this.view.css;
        this.isSelected = false;
        this.category = category;
        this.prev = prev;
        this.idx = i;
        this.clazzType = "item";
        this.lazy = lazy;
        this.load();
    },
    _load: function () {
        this.loading = true;

        if(!this.node)this.view.fireEvent("queryLoadItemRow", [null, this]);

        var viewStyles = this.view.viewJson.viewStyles;
        var viewContentTdNode = (viewStyles && viewStyles["contentTd"]) ? viewStyles["contentTd"] : this.css.viewContentTdNode;

        if(!this.node)this.loadNode();

        //if (this.view.json.select==="single" || this.view.json.select==="multi"){
        this.selectTd = new Element("td", {"styles": viewContentTdNode}).inject(this.node);
        this.selectTd.setStyles({"cursor": "pointer"});
        if (this.view.json.itemStyles) this.selectTd.setStyles(this.view.json.itemStyles);

        //var selectFlag = this.view.json.select || this.view.viewJson.select ||  "none";
        var selectFlag = this.view.getSelectFlag();
        if (this.data.$selectedEnable && ["multi", "single"].contains(selectFlag) && this.view.viewJson.selectBoxShow === "always") {
            var viewStyles = this.view.viewJson.viewStyles;
            if (viewStyles) {
                if (selectFlag === "single") {
                    this.selectTd.setStyles(viewStyles["radioNode"]);
                } else {
                    this.selectTd.setStyles(viewStyles["checkboxNode"]);
                }
            } else {
                var iconName = "checkbox";
                if (selectFlag === "single") iconName = "radiobox";
                this.selectTd.setStyles({"background": "url(" + "../x_component_query_Query/$Viewer/default/icon/" + iconName + ".png) center center no-repeat"});
            }
        }

        if (this.view.isSelectTdHidden()) {
            this.selectTd.hide();
        }
        //}

        //序号
        var sequence = 1 + this.view.json.pageSize * (this.view.currentPage - 1) + this.idx;
        this.data["$sequence"] = sequence;
        if (this.view.viewJson.isSequence === "yes") {
            this.sequenceTd = new Element("td", {"styles": viewContentTdNode}).inject(this.node);
            this.sequenceTd.setStyles({
                "width": "30px",
                "text-align": "center"
            });
            this.sequenceTd.set("text", sequence);
        }

        Object.each(this.view.entries, function (c, k) {
            //if (cell){
            if (this.view.hideColumns.indexOf(k) === -1) {
                var td = new Element("td", {"styles": viewContentTdNode}).inject(this.node);

                var cell = this.getText(c, k, td); //this.data[k];
                if (cell === undefined || cell === null) cell = "";

                // if (k!== this.view.viewJson.group.column){
                var v = cell;
                if (c.isHtml) {
                    td.set("html", v);
                } else {
                    td.set("text", v);
                }

                if (typeOf(c.contentProperties) === "object") td.setProperties(c.contentProperties);
                if (this.view.json.itemStyles) td.setStyles(this.view.json.itemStyles);
                if (typeOf(c.contentStyles) === "object") td.setStyles(c.contentStyles);
                // }else{
                //     if (this.view.json.itemStyles) td.setStyles(this.view.json.itemStyles);
                // }

                if (this.view.openColumns.indexOf(k) !== -1) {
                    this.setOpenWork(td, c)
                }

                // if (k!== this.view.viewJson.group.column){
                Object.each(c.events || {}, function (e, key) {
                    if (e.code) {
                        if (key === "loadContent") {
                            this.view.Macro.fire(e.code,
                                {"node": td, "json": c, "data": v, "view": this.view, "row": this});
                        } else if (key !== "loadTitle") {
                            td.addEvent(key, function (event) {
                                return this.view.Macro.fire(
                                    e.code,
                                    {"node": td, "json": c, "data": v, "view": this.view, "row": this},
                                    event
                                );
                            }.bind(this));
                        }
                    }
                }.bind(this));
                // }
            }
            //}
        }.bind(this));

        if(this.placeholderTd){
            this.placeholderTd.destroy();
            this.placeholderTd = null;
        }

        //默认选中
        var selectedFlag;

        var defaultSelectedScript = this.view.json.defaultSelectedScript || this.view.viewJson.defaultSelectedScript;
        if (!this.isSelected && defaultSelectedScript) {
            // var flag = this.view.json.select || this.view.viewJson.select ||  "none";
            // if ( flag ==="single" || flag==="multi"){
            //
            // }
            selectedFlag = this.view.Macro.exec(defaultSelectedScript,
                {"node": this.node, "data": this.data, "view": this.view, "row": this});
        }

        //判断是不是在selectedItems中，用户手工选择
        if (!this.isSelected && this.view.selectedItems.length) {
            for (var i = 0; i < this.view.selectedItems.length; i++) {
                if (this.view.selectedItems[i].dataString === this.dataString) {
                    selectedFlag = "true";
                    break;
                }
            }
        }

        if (selectedFlag) {
            if (selectedFlag === "multi" || selectedFlag === "single") {
                this.select(selectedFlag);
            } else if (selectedFlag.toString() === "true") {
                var f = this.view.json.select || this.view.viewJson.select || "none";
                if (f === "single" || f === "multi") {
                    this.select();
                }
            }
        }

        this.setEvent();

        this.view.fireEvent("postLoadItemRow", [null, this]);

        this.loading = false;
        this.loaded = true;
    },
    selected: function( from ){
        for(var i=0; i<this.view.selectedItems.length; i++){
            var item = this.view.selectedItems[i];
            if( item.dataString === this.dataString ){
                this.view.selectedItems.erase(item);
                break;
            }
        }
        this.view.selectedItems.push(this);
        var viewStyles = this.view.viewJson.viewStyles;
        if( viewStyles ){
            this.selectTd.setStyles( viewStyles["checkedCheckboxNode"] );
            this.node.setStyles( viewStyles["contentSelectedTr"] );
        }else{
            this.selectTd.setStyles({"background": "url("+"../x_component_query_Query/$Viewer/default/icon/checkbox_checked.png) center center no-repeat"});
            this.node.setStyles(this.css.viewContentTrNode_selected);
        }
        this.isSelected = true;
        if( from !== "view" && from !=="category" && this.view.viewJson.allowSelectAll ){
            this.view.checkSelectAllStatus();
            if( this.category )this.category.checkSelectAllStatus();
        }
        this.view.fireEvent("selectRow", [this]);
        this.view.fireEvent("select", [{
            "selected": true,
            "item": this,
            "data": this.data
        }]); //options 传入的事件
    },
    unSelected: function( from ){
        for(var i=0; i<this.view.selectedItems.length; i++){
            var item = this.view.selectedItems[i];
            if( item.dataString === this.dataString ){
                this.view.selectedItems.erase(item);
                break;
            }
        }
        var viewStyles = this.view.viewJson.viewStyles;
        if( this.view.viewJson.selectBoxShow !=="always" ){
            this.selectTd.setStyles({"background": "transparent"});
        }else{
            if (viewStyles) {
                this.selectTd.setStyles(viewStyles["checkboxNode"]);
            }else{
                this.selectTd.setStyles({"background": "url(" + "../x_component_query_Query/$Viewer/default/icon/checkbox.png) center center no-repeat"});
            }
        }
        if( viewStyles ){
            this.node.setStyles( viewStyles["contentTr"] );
        }else{
            this.node.setStyles(this.css.viewContentTrNode);
        }
        this.isSelected = false;
        if( from !== "view" && from !=="category" && this.view.viewJson.allowSelectAll ){
            this.view.checkSelectAllStatus();
            if( this.category )this.category.checkSelectAllStatus();
        }
        this.view.fireEvent("unselectRow", [this]);
        this.view.fireEvent("unselect", [{
            "selected": false,
            "item": this,
            "data": this.data
        }]); //options 传入的事件
    },
    getDataByPath: function (obj, path) {
        var pathList = path.split(".");
        for (var i = 0; i < pathList.length; i++) {
            var p = pathList[i];
            if ((/(^[1-9]\d*$)/.test(p))) p = p.toInt();
            if (obj[p]) {
                obj = obj[p];
            } else if(obj[p] === undefined || obj[p] === null) {
                obj = "";
                break;
            } else {
                obj = obj[p];
                break;
            }
        }
        return obj
    },
    getText: function (c, k, td) {
        var path = c.path, code = c.code, obj = this.data;
        if (!path) {
           var co = code && code.trim();
           if( !co )return "";
           obj = "";
        } else if (path === "$all") {
        } else {
            obj = this.getDataByPath(obj, path);
        }

        if (code && code.trim()) obj = this.view.Macro.exec(code, {
            "value": obj,
            "data": this.data,
            "entry": c,
            "node": td,
            "json": c,
            "row": this
        });

        var toName = function (value) {
            if (typeOf(value) === "array") {
                Array.each(value, function (v, idx) {
                    value[idx] = toName(v)
                })
            } else if (typeOf(value) === "object") {
                Object.each(value, function (v, key) {
                    value[key] = toName(v);
                })
            } else if (typeOf(value) === "string") {
                value = o2.name.cn(value)
            }
            return value;
        };

        var d;
        if (obj != undefined && obj != null) {
            if (typeOf(obj) === "array") {
                d = c.isName ? JSON.stringify(toName(Array.clone(obj))) : JSON.stringify(obj);
            } else if (typeOf(obj) === "object") {
                d = c.isName ? JSON.stringify(toName(Object.clone(obj))) : JSON.stringify(obj);
            } else {
                d = c.isName ? o2.name.cn(obj.toString()) : obj;
            }
        }

        return d;
    },
    setOpenWork: function (td, column) {
        td.setStyle("cursor", "pointer");
        if (column.clickCode) {
            if (!this.view.Macro) {
                MWF.require("MWF.xScript.Macro", function () {
                    this.view.businessData = {};
                    this.view.Macro = new MWF.Macro.ViewContext(this.view);
                }.bind(this), false);
            }
            td.addEvent("click", function (ev) {
                var result = this.view.Macro.fire(column.clickCode, this, ev);
                ev.stopPropagation();
                return result;
            }.bind(this));
        } else if (this.view.statementJson.entityCategory === "official" && column.idPath) {
            var id = this.getDataByPath(this.data, column.idPath);
            if (id) {
                if (this.view.statementJson.entityClassName === "com.x.cms.core.entity.Document") {
                    td.addEvent("click", function (ev) {
                        this.openCms(ev, id);
                        ev.stopPropagation();
                    }.bind(this));
                } else {
                    td.addEvent("click", function (ev) {
                        this.openWork(ev, id);
                        ev.stopPropagation();
                    }.bind(this));
                }
            }
        }
    },
    openCms: function (e, id) {
        var options = {"documentId": id};
        this.view.fireEvent("openDocument", [options, this]); //options 传入的事件
        layout.desktop.openApplication(e, "cms.Document", options);
    },
    openWork: function (e, id) {
        var options = {"workId": id};
        this.view.fireEvent("openDocument", [options, this]); //options 传入的事件
        layout.desktop.openApplication(e, "process.Work", options);
    }
});

MWF.xApplication.query.Query.Statement.Filter = new Class({
    Extends: MWF.xApplication.query.Query.Viewer.Filter
});

MWF.xApplication.query.Query.Statement.Actionbar = new Class({
    Extends: MWF.xApplication.query.Query.Viewer.Actionbar
});

MWF.xApplication.query.Query.Statement.Paging = new Class({
    Extends: MWF.xApplication.query.Query.Viewer.Paging
});

MWF.xDesktop.requireApp("Template", "utils.ExcelUtils", null, false);
MWF.xApplication.query.Query.Statement.ExcelUtils = new Class({
    Extends: MWF.xApplication.Template.utils.ExcelUtils
});
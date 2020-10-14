MWF.require("MWF.widget.Common", null, false);
MWF.require("MWF.widget.JsonTemplate", null, false);

MWF.xDesktop.requireApp("query.ViewDesigner", "Property", null, false);
MWF.xApplication.query.StatementDesigner.Property = MWF.SDProperty = new Class({
    Extends: MWF.xApplication.query.ViewDesigner.Property,
    Implements: [Options, Events],
    options: {
        "style": "default"
    },
    show: function () {
        if (!this.propertyContent) {
            this.getHtmlString(function () {
                if (this.htmlString) {
                    this.JsonTemplate = new MWF.widget.JsonTemplate(this.data, this.htmlString);
                    this.propertyContent = new Element("div", {"styles": {"overflow": "hidden"}}).inject(this.propertyNode);
                    this.propertyContent.set("html", this.JsonTemplate.load());

                    this.setEditNodeEvent();
                    this.setEditNodeStyles(this.propertyContent);
                    this.loadPropertyTab();
                    this.loadPersonInput();
                    this.loadPersonSelectInput();
                    this.loadViewFilter();
                    this.loadScriptArea();

                    this.loadColumnExportEditor();

                    this.loadJSONArea();

                    this.loadEventsEditor();
                    this.loadViewStylesArea();
                    this.loadPagingStylesArea();
                    this.loadActionStylesArea();
                    this.loadActionArea();
                    this.loadStylesList();
                    this.loadMaplist();
                }
            }.bind(this));
        } else {
            this.propertyContent.setStyle("display", "block");
        }
    },
    loadViewFilter: function () {
        var nodes = this.propertyContent.getElements(".MWFViewFilter");
        //var filtrData = this.view.data.data.filterList;
        var customData = this.view.data.data.customFilterList;
        nodes.each(function (node) {
            MWF.xDesktop.requireApp("query.StatementDesigner", "widget.ViewFilter", function () {
                var _slef = this;
                new MWF.xApplication.query.StatementDesigner.widget.ViewFilter(node, this.view.designer, {
                    // "filtrData": filtrData,
                    "customData": customData
                }, {
                    "onChange": function (ids) {
                        var data = this.getData();
                        // _slef.changeJsonDate(["data", "filterList"], data.data);
                        _slef.changeJsonDate(["data", "customFilterList"], data.customData);
                    }
                });
            }.bind(this));
        }.bind(this));
    }
});
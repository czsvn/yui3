/**
Adds the ability to make the table rows scrollable while preserving the header
placement.

There are two types of scrolling, horizontal (x) and vertical (y).  Horizontal
scrolling is achieved by wrapping the entire table in a scrollable container.
Vertical scrolling is achieved by splitting the table headers and data into two
separate tables, the latter of which is wrapped in a vertically scrolling
container.  In this case, column widths of header cells and data cells are kept
in sync programmatically.

Since the split table synchronization can be costly at runtime, the split is only done if the data in the table stretches beyond the configured `height` value.

To activate or deactivate scrolling, set the `scrollable` attribute to one of
the following values:

 * `false` - (default) Scrolling is disabled.
 * `true` or 'xy' - If `height` is set, vertical scrolling will be activated, if
            `width` is set, horizontal scrolling will be activated.
 * 'x' - Activate horizontal scrolling only. Requires the `width` attribute is
         also set.
 * 'y' - Activate vertical scrolling only. Requires the `height` attribute is
         also set.

 @module datatable-scroll
 @class DataTable.Scrollable
 @for DataTable
**/
var YLang = Y.Lang,
    isString = YLang.isString,
    isNumber = YLang.isNumber,
    isArray  = YLang.isArray,

    Scrollable;

Y.DataTable.Scrollable = Scrollable = function () {};

Scrollable.ATTRS = {
    /**
    Activates or deactivates scrolling in the table.  Acceptable values are:

     * `false` - (default) Scrolling is disabled.
     * `true` or 'xy' - If `height` is set, vertical scrolling will be activated, if
                `width` is set, horizontal scrolling will be activated.
     * 'x' - Activate horizontal scrolling only. Requires the `width` attribute is
             also set.
     * 'y' - Activate vertical scrolling only. Requires the `height` attribute is
             also set.

    @attribute scrollable
    @type {String|Boolean}
    @value false
    **/
    scrollable: {
        value: false,
        setter: '_setScrollable'
    }
};

Y.mix(Scrollable.prototype, {

    /**
    Scrolls a given row or cell into view if the table is scrolling.  Pass the
    `clientId` of a Model from the DataTable's `data` ModelList or its row
    index to scroll to a row or a [row index, column index] array to scroll to
    a cell.  Alternately, to scroll to any element contained within the table's
    scrolling areas, pass its ID, or the Node itself (though you could just as
    well call `node.scrollIntoView()` yourself, but hey, whatever).

    @method scrollTo
    @param {String|Number|Number[]|Node} id A row clientId, row index, cell
            coordinate array, id string, or Node
    @return {DataTable}
    @chainable
    **/
    scrollTo: function (id) {
        var target;

        if (id && this._tbodyNode && (this._yScrollNode || this._xScrollNode)) {
            if (isArray(id)) {
                target = this.getCell(id);
            } else if (isNumber(id)) { 
                target = this.getRow(id);
            } else if (isString(id)) {
                target = this._tbodyNode.one('#' + id);
            } else if (id instanceof Y.Node &&
                    // TODO: ancestor(yScrollNode, xScrollNode)
                    id.ancestor('.yui3-datatable') === this.get('boundingBox')) {
                target = id;
            }

            target && target.scrollIntoView();
        }

        return this;
    },

    //--------------------------------------------------------------------------
    // Protected properties and methods
    //--------------------------------------------------------------------------

    /**
    Template for the `<table>` that is used to fix the caption in place when
    the table is horizontally scrolling.

    @property _CAPTION_TABLE_TEMPLATE
    @type {HTML}
    @value '<table class="{className}" role="presentation"></table>'
    @protected
    **/
    _CAPTION_TABLE_TEMPLATE: '<table class="{className}" role="presentation"></table>',

    /**
    Template used to create sizable element liners around header content to
    synchronize fixed header column widths.

    @property _SCROLL_LINER_TEMPLATE
    @type {HTML}
    @value '<div class="{className}"></div>'
    @protected
    **/
    _SCROLL_LINER_TEMPLATE: '<div class="{className}"></div>',

    /**
    Template for the virtual scrollbar needed in "y" and "xy" scrolling setups.

    @property _SCROLLBAR_TEMPLATE
    @type {HTML}
    @value '<div class="{className}"><div></div></div>'
    @protected
    **/
    _SCROLLBAR_TEMPLATE: '<div class="{className}"><div></div></div>',

    /**
    Template for the `<div>` that is used to contain the table when the table is
    horizontally scrolling.

    @property _X_SCROLLER_TEMPLATE
    @type {HTML}
    @value '<div class="{className}"></div>'
    @protected
    **/
    _X_SCROLLER_TEMPLATE: '<div class="{className}"></div>',

    /**
    Template for the `<table>` used to contain the fixed column headers for
    vertically scrolling tables.

    @property _Y_SCROLL_HEADER_TEMPLATE
    @type {HTML}
    @value '<table role="presentation" aria-hidden="true" class="{className}"></table>'
    @protected
    **/
    _Y_SCROLL_HEADER_TEMPLATE: '<table role="presentation" aria-hidden="true" class="{className}"></table>',

    /**
    Template for the `<div>` that is used to contain the rows when the table is
    vertically scrolling.

    @property _Y_SCROLLER_TEMPLATE
    @type {HTML}
    @value '<div class="{className}"></div>'
    @protected
    **/
    _Y_SCROLLER_TEMPLATE: '<div class="{className}"></div>',

    /**
    Adds padding to the last cells in the fixed header for vertically scrolling
    tables.  This padding is equal in width to the scrollbar, so can't be
    relegated to a stylesheet.

    @method _addScrollbarPadding
    @protected
    **/
    _addScrollbarPadding: function () {
        var fixedHeader = this._yScrollHeader,
            headerClass = '.' + this.getClassName('header'),
            scrollbarWidth, rows, header, i, len;

        if (fixedHeader) {
            scrollbarWidth = Y.DOM.getScrollbarWidth() + 'px';
            rows = fixedHeader.all('tr');

            for (i = 0, len = rows.size(); i < len; i += +header.get('rowSpan')) {
                header = rows.item(i).all(headerClass).pop();
                header.setStyle('paddingRight', scrollbarWidth);
            }
        }
    },

    /**
    Reacts to changes in the `scrollable` attribute by updating the `_xScroll`
    and `_yScroll` properties and syncing the scrolling structure accordingly.

    @method _afterScrollableChange
    @param {EventFacade} e The relevant change event (ignored)
    @protected
    **/
    _afterScrollableChange: function (e) {
        this._syncScrollUI();
    },

    /**
    Reacts to changes in the `caption` attribute by adding, removing, or
    syncing the caption table when the table is set to scroll.

    @method _afterScrollCaptionChange
    @param {EventFacade} e The relevant change event (ignored)
    @protected
    **/
    _afterScrollCaptionChange: function (e) {
        if (this._xScroll || this._yScroll) {
            this._syncScrollUI();
        }
    },

    /**
    Reacts to changes in the `columns` attribute of vertically scrolling tables
    by refreshing the fixed headers, scroll container, and virtual scrollbar
    position.

    @method _afterScrollColumnsChange
    @param {EventFacade} e The relevant change event (ignored)
    @protected
    **/
    _afterScrollColumnsChange: function (e) {
        if (this._xScroll || this._yScroll) {
            if (this._yScroll && this._yScrollHeader) {
                this._syncScrollHeaders();
            }

            this._syncScrollUI();
        }
    },

    /**
    Reacts to changes in vertically scrolling table's `data` ModelList by
    synchronizing the fixed column header widths and virtual scrollbar height.

    @method _afterScrollDataChange
    @param {EventFacade} e The relevant change event (ignored)
    @protected
    **/
    _afterScrollDataChange: function (e) {
        if (this._xScroll || this._yScroll) {
            this._syncScrollUI();
        }
    },

    /**
    Reacts to changes in the `height` attribute of vertically scrolling tables
    by updating the height of the `<div>` wrapping the data table and the
    virtual scrollbar.  If `scrollable` was set to "y" or "xy" but lacking a
    declared `height` until the received change, `_syncScrollUI` is called to
    create the fixed headers etc.

    @method _afterScrollHeightChange
    @param {EventFacade} e The relevant change event (ignored)
    @protected
    **/
    _afterScrollHeightChange: function (e) {
        if (this._yScroll) {
            this._syncScrollUI();
        }
    },

    /**
    Reacts to changes in the width of scrolling tables by expanding the width of
    the `<div>` wrapping the data table for horizontally scrolling tables or
    upding the position of the virtual scrollbar for vertically scrolling
    tables.

    @method _afterScrollWidthChange
    @param {EventFacade} e The relevant change event (ignored)
    @protected
    **/
    _afterScrollWidthChange: function (e) {
        if (this._xScroll || this._yScroll) {
            this._syncScrollUI();
        }
    },

    /**
    Binds virtual scrollbar interaction to the `_yScrollNode`'s `scrollTop` and
    vice versa.

    @method _bindScrollbar
    @protected
    **/
    _bindScrollbar: function () {
        var scrollbar = this._scrollbarNode,
            scroller  = this._yScrollNode;

        if (scrollbar && scroller && !this._scrollbarEventHandle) {
            this._scrollbarEventHandle = new Y.Event.Handle([
                scrollbar.on('scroll', this._syncScrollPosition, this, 'virtual'),
                scroller.on('scroll', this._syncScrollPosition, this)
            ]);
        }
    },

    /**
    Binds to the window resize event to update the vertical scrolling table
    headers and wrapper `<div>` dimensions.

    @method _bindScrollResize
    @protected
    **/
    _bindScrollResize: function () {
        if (!this._scrollResizeHandle) {
            // TODO: sync header widths and scrollbar position.  If the height
            // of the headers has changed, update the scrollbar dims as well.
            this._scrollResizeHandle = Y.on('resize',
                this._syncScrollUI, null, this);
        }
    },

    /**
    Attaches internal subscriptions to keep the scrolling structure up to date
    with changes in the table's `data`, `columns`, `caption`, or `height`.  The
    `width` is taken care of already.

    This executes after the table's native `bindUI` method.

    @method _bindScrollUI
    @protected
    **/
    _bindScrollUI: function () {
        this.after({
            columnsChange: Y.bind('_afterScrollColumnsChange', this),
            heightChange : Y.bind('_afterScrollHeightChange', this),
            widthChange  : Y.bind('_afterScrollWidthChange', this),
            captionChange: Y.bind('_afterScrollCaptionChange', this)
        });

        this.after(['dataChange', '*:add', '*:remove', '*:reset', '*:change'],
            Y.bind('_afterScrollDataChange', this));
    },

    /**
    Clears the lock and timer used to manage synchronizing the scroll position
    between the vertical scroll container and the virtual scrollbar.

    @method _clearScrollLock
    @protected
    **/
    _clearScrollLock: function () {
        if (this._scrollLock) {
            this._scrollLock.cancel();
            delete this._scrollLock;
        }
    },

    /**
    Creates a virtual scrollbar from the `_SCROLLBAR_TEMPLATE`, assigning it to
    the `_scrollbarNode` property.

    @method _createScrollbar
    @return {Node} The created Node
    @protected
    **/
    _createScrollbar: function () {
        var scrollbar = this._scrollbarNode;

        if (!scrollbar) {
            scrollbar = this._scrollbarNode = Y.Node.create(
                Y.Lang.sub(this._SCROLLBAR_TEMPLATE, {
                    className: this.getClassName('scrollbar')
                }));

            scrollbar.setStyle('width', Y.DOM.getScrollbarWidth() + 'px');
        }

        return scrollbar;
    },

    /**
    Creates a separate table to contain the caption when the table is
    configured to scroll vertically or horizontally.

    @method _createScrollCaptionTable
    @return {Node} The created Node
    @protected
    **/
    _createScrollCaptionTable: function () {
        if (!this._captionTable) {
            this._captionTable = Y.Node.create(
                Y.Lang.sub(this._CAPTION_TABLE_TEMPLATE, {
                    className: this.getClassName('caption', 'table')
                }));
        }

        return this._captionTable;
    },

    /**
    Populates the `_xScrollNode` property by creating the `<div>` Node described
    by the `_X_SCROLLER_TEMPLATE`.

    @method _createXScrollNode
    @return {Node} The created Node
    @protected
    **/
    _createXScrollNode: function () {
        if (!this._xScrollNode) {
            this._xScrollNode = Y.Node.create(
                Y.Lang.sub(this._X_SCROLLER_TEMPLATE, {
                    className: this.getClassName('x','scroller')
                }));
        }

        return this._xScrollNode;
    },

    /**
    Populates the `_yScrollHeader` property by creating the `<table>` Node
    described by the `_Y_SCROLL_HEADER_TEMPLATE`.

    @method _createYScrollHeader
    @return {Node} The created Node
    @protected
    **/
    _createYScrollHeader: function () {
        var fixedHeader = this._yScrollHeader;

        if (!fixedHeader) {
            fixedHeader = this._yScrollHeader = Y.Node.create(
                Y.Lang.sub(this._Y_SCROLL_HEADER_TEMPLATE, {
                    className: this.getClassName('scroll','columns')
                }));

            // Needed for IE which creates an empty <tbody> in the table
            fixedHeader.empty();
        }

        return fixedHeader;
    },

    /**
    Populates the `_yScrollNode` property by creating the `<div>` Node described
    by the `_Y_SCROLLER_TEMPLATE`.

    @method _createYScrollNode
    @return {Node} The created Node
    @protected
    **/
    _createYScrollNode: function () {
        if (!this._yScrollNode) {
            this._yScrollNode = Y.Node.create(
                Y.Lang.sub(this._Y_SCROLLER_TEMPLATE, {
                    className: this.getClassName('y','scroller')
                }));
        }

        return this._yScrollNode;
    },

    /**
    Removes the nodes used to create horizontal and vertical scrolling and
    rejoins the caption to the main table if needed.

    @method _disableScrolling
    @protected
    **/
    _disableScrolling: function () {
        this._removeScrollCaptionTable();
        this._disableXScrolling();
        this._disableYScrolling();

        this._tableNode.setStyle('width', this.get('width'));
    },

    /**
    Removes the nodes used to allow horizontal scrolling.

    @method _disableXScrolling
    @protected
    **/
    _disableXScrolling: function () {
        this._removeXScrollNode();
    },

    /**
    Removes the nodes used to allow vertical scrolling.

    @method _disableYScrolling
    @protected
    **/
    _disableYScrolling: function () {
        this._removeYScrollHeader();
        this._removeYScrollNode();
        this._removeScrollbar();
    },

    /**
    Cleans up external event subscriptions.

    @method destructor
    @protected
    **/
    destructor: function () {
        this._unbindScrollbar();
        this._unbindScrollResize();
        this._clearScrollLock();
    },

    /**
    Sets up event handlers and AOP advice methods to bind the DataTable's natural
    behaviors with the scrolling APIs and state.

    @method initializer
    @param {Object} config The config object passed to the constructor (ignored)
    @protected
    **/
    initializer: function () {
        this._setScrollProperties();

        this.after(['scrollableChange', 'heightChange', 'widthChange'],
            this._setScrollProperties);

        Y.Do.after(this._bindScrollUI, this, 'bindUI');
        Y.Do.after(this._syncScrollUI, this, 'syncUI');
    },

    /**
    Removes the table used to house the caption when the table is scrolling.

    @method _removeScrollCaptionTable
    @protected
    **/
    _removeScrollCaptionTable: function () {
        if (this._captionTable) {
            if (this._captionNode) {
                this._tableNode.prepend(this._captionNode);
            }

            this._captionTable.remove().destroy(true);

            delete this._captionTable;
        }
    },

    /**
    Removes the `<div>` wrapper used to contain the data table when the table
    is horizontally scrolling.

    @method _removeXScrollNode
    @protected
    **/
    _removeXScrollNode: function () {
        var scroller = this._xScrollNode;

        if (scroller) {
            scroller.replace(scroller.get('childNodes').toFrag());
            scroller.remove().destroy(true);

            delete this._yScrollNode;
        }
    },

    /**
    Removes the `<table>` used to contain the fixed column headers when the
    table is vertically scrolling.

    @method _removeYScrollHeader
    @protected
    **/
    _removeYScrollHeader: function () {
        if (this._yScrollHeader) {
            this._yScrollHeader.remove().destroy(true);

            delete this._yScrollHeader;
        }
    },

    /**
    Removes the `<div>` wrapper used to contain the data table when the table
    is vertically scrolling.

    @method _removeYScrollNode
    @protected
    **/
    _removeYScrollNode: function () {
        if (this._yScrollNode) {
            this._yScrollNode.remove().destroy(true);

            delete this._yScrollNode;
        }
    },

    /**
    Removes the virtual scrollbar used by scrolling tables.

    @method _removeScrollbar
    @protected
    **/
    _removeScrollbar: function () {
        if (this._scrollbarNode) {
            this._scrollBarNode.remove().destroy(true);

            delete this._scrollBarNode;
        }
    },

    /**
    Accepts (case insensitive) values "x", "y", "xy", `true`, and `false`.
    `true` is translated to "xy" and upper case values are converted to lower
    case.  All other values are invalid.

    @method _setScrollable
    @param {String|Boolea} val Incoming value for the `scrollable` attribute
    @return {String}
    @protected
    **/
    _setScrollable: function (val) {
        if (val === true) {
            val = 'xy';
        }

        if (isString(val)) {
            val = val.toLowerCase();
        }

        return (val === false || val === 'y' || val === 'x' || val === 'xy') ?
            val :
            Y.Attribute.INVALID_VALUE;
    },

    /**
    Assigns the `_xScroll` and `_yScroll` properties to true if an
    appropriate value is set in the `scrollable` attribute and the `height`
    and/or `width` is set.

    @method _setScrollProperties
    @protected
    **/
    _setScrollProperties: function () {
        var scrollable = this.get('scrollable') || '',
            width      = this.get('width'),
            height     = this.get('height');

        this._xScroll = width  && scrollable.indexOf('x') > -1;
        this._yScroll = height && scrollable.indexOf('y') > -1;
    },

    /**
    Keeps the virtual scrollbar and the scrolling `<div>` wrapper around the
    data table in vertically scrolling tables in sync.

    @method _syncScrollPosition
    @param {DOMEventFacade} e The scroll event
    @param {String} [source] The string "virtual" if the event originated from
                        the virtual scrollbar
    @protected
    **/
    _syncScrollPosition: function (e, source) {
        var scrollbar = this._scrollbarNode,
            scroller  = this._yScrollNode;

        if (scrollbar && scroller) {
            if (this._scrollLock && this._scrollLock.source !== source) {
                return;
            }

            this._clearScrollLock();
            this._scrollLock = Y.later(300, this, this._clearScrollLock);
            this._scrollLock.source = source;

            if (source === 'virtual') {
                scroller.set('scrollTop', scrollbar.get('scrollTop'));
            } else {
                scrollbar.set('scrollTop', scroller.get('scrollTop'));
            }
        }
    },

    /**
    Splits or merges the table for X and Y scrolling depending on the current
    widget state.  If the table needs to be split, but is already, does nothing.

    @method _syncScrollUI
    @protected
    **/
    _syncScrollUI: function () {
        this._uiSetScrollable();

        if (this._xScroll && this._yScroll) {
            this._syncScrollCaptionUI();
            this._syncXYScrollUI();
        } else if (this._xScroll) {
            this._disableYScrolling();
            this._syncScrollCaptionUI();
            this._syncXScrollUI();
        } else if (this._yScroll) {
            this._disableXScrolling();
            this._syncScrollCaptionUI();
            this._syncYScrollUI();
        } else {
            this._disableScrolling();
        }
    },

    /*
        if (
        if (this._yScroll || this._xScroll) {
            this._uiSetDim('width', '');
        }

        this._syncScrollCaptionUI();

        this._syncXScrollUI();

        this._syncYScrollUI();

        if (this._yScroll || this._xScroll) {
            if (this._captionTable) {
                width = (this._xScrollNode || this._tableNode)
                        .get('offsetWidth') + 'px';

                this._captionTable.setStyle('width', width);
            }

            this._uiSetDim('width', this.get('width'));

            if (this._scrollbarNode) {
                this._syncScrollbarHeight();
                this._syncScrollbarPosition();
            }
        }
    },
    */

    /**
    Splits the caption from the data `<table>` if the table is configured to
    scroll.  If not, rejoins the caption to the data `<table>` if it needs to
    be.

    @method _syncScrollCaptionUI
    @protected
    **/
    _syncScrollCaptionUI: function () {
        var caption      = this._captionNode,
            table        = this._tableNode,
            captionTable = this._captionTable,
            id;

        if (caption) {
            id = caption.getAttribute('id');

            if (!captionTable) {
                captionTable = this._createScrollCaptionTable();

                this.get('contentBox').prepend(captionTable);
            }

            if (!caption.get('parentNode').compareTo(captionTable)) {
                captionTable.empty().insert(caption);

                if (!id) {
                    id = Y.stamp(caption);
                    caption.setAttribute('id', id);
                }

                table.setAttribute('aria-describedby', id);
            }
        } else if (captionTable) {
            this._removeScrollCaptionTable();
        }
    },

    /**
    Assigns widths to the fixed header columns to match the columns in the data
    table.

    @method _syncScrollColumnWidths
    @protected
    **/
    _syncScrollColumnWidths: function () {
        var headers;

        if (this._theadNode && this._yScrollHeader) {
            headers = this._theadNode.all('.' + this.getClassName('header'));

            this._yScrollHeader.all('.' + this.getClassName('scroll', 'liner'))
                .each(function (liner, i) {
                    var header = headers.item(i),
                        padding = [
                            header.getComputedStyle('paddingLeft'),
                            header.getComputedStyle('paddingRight')
                        ];

                    padding[0] = parseInt(padding[0], 10) | 0;

                    padding = padding[0] + (parseInt(padding[1], 10) | 0);

                    // Can't use getComputedStyle('width') because IE 7- return
                    // the <col>'s width even though it's not honoring it.
                    liner.setStyle('width',
                        (header.get('clientWidth') - padding) + 'px');
                });
        }
    },

    /**
    Creates matching headers in the fixed header table for vertically scrolling
    tables and synchronizes the column widths.

    @method _syncScrollHeaders
    @protected
    **/
    _syncScrollHeaders: function () {
        var fixedHeader   = this._yScrollHeader,
            linerTemplate = this._SCROLL_LINER_TEMPLATE,
            linerClass    = this.getClassName('scroll', 'liner');

        if (this._theadNode && fixedHeader) {
            fixedHeader.empty().appendChild(
                this._theadNode.cloneNode(true));

            // Prevent duplicate IDs and assign ARIA attributes to hide
            // from screen readers
            fixedHeader.all('*')
                .removeAttribute('id')
                .setAttribute('role', 'presentation')
                .setAttribute('aria-hidden', true);

            fixedHeader.all('.' + this.getClassName('header'))
                .each(function (header) {
                    var liner = Y.Node.create(Y.Lang.sub(linerTemplate, {
                            className: linerClass
                        }));

                    liner.appendChild(header.get('childNodes').toFrag());

                    header.appendChild(liner);
                }, this);

            this._syncScrollColumnWidths();

            this._addScrollbarPadding();
        }
    },

    /**
    Wraps the table in a scrolling `<div>` of the configured width for "x"
    scrolling.

    @method _syncXScrollUI
    @protected
    **/
    _syncXScrollUI: function () {
        var boundingBox = this.get('boundingBox'),
            scroller    = this._xScrollNode,
            table       = this._tableNode,
            captionTable = this._captionTable,
            borderWidth, tableWidth;

        if (captionTable) {
            captionTable.setStyle('width', this.get('width'));
        }

        if (!scroller) {
            scroller = this._createXScrollNode();

            table.wrap(scroller);
        }

        // Can't use offsetHeight - clientHeight because IE6 returns
        // clientHeight of 0 intially.
        borderWidth =
            (parseInt(scroller.getComputedStyle('borderLeftWidth'), 10)|0) +
            (parseInt(scroller.getComputedStyle('borderRightWidth'), 10)|0);

        table.setStyle('width', '');
        scroller.setStyle('width', '');
        this._uiSetDim('width', '');

        tableWidth = table.get('offsetWidth');

        // Lock the table width to avoid configured column widths being ignored
        table.setStyle('width', tableWidth + 'px');

        this._uiSetDim('width', this.get('width'));

        // Can't use 100% width because the borders add additional width
        // TODO: Cache the border widths, though it won't prevent a reflow
        scroller.setStyle('width',
            (boundingBox.get('offsetWidth') - borderWidth) + 'px');

        // expand the table to fill the assigned width if it doesn't
        // already overflow the configured width
        if ((scroller.get('offsetWidth') - borderWidth) > tableWidth) {
            // Assumes the wrapped table doesn't have borders
            table.setStyle('width', '100%');
        }
    },

    /**
    Wraps the table in vertically and horizontally scrolling `<div>`s for "xy"
    scrolling.

    @method _syncXYScrollUI
    @protected
    **/
    _syncXYScrollUI: function () {
        /*
        var boundingBox = this.get('boundingBox'),
            xScroller   = this._xScrollNode,
            yScroller   = this._yScrollNode,
            fixedHeader = this._yScrollHeader,
            scrollbar   = this._scrollbarNode,
            table       = this._tableNode,
            width       = this.get('width'),
            borderWidth;
            */

    },

    /**
    Wraps the table in a scrolling `<div>` of the configured height (accounting
    for the caption if there is one) if "y" scrolling is enabled.  Otherwise,
    unwraps the table if necessary.

    @method _syncYScrollUI
    @protected
    **/
    _syncYScrollUI: function () {
        var scroller     = this._yScrollNode,
            fixedHeader  = this._yScrollHeader,
            scrollbar    = this._scrollbarNode,
            table        = this._tableNode,
            thead        = this._theadNode,
            captionTable = this._captionTable,
            boundingBox  = this.get('boundingBox'),
            contentBox   = this.get('contentBox'),
            width        = this.get('width');

        table.setStyle('width', '');

        if (captionTable) {
            captionTable.setStyle('width', width || '100%');
        }

        if (!scroller) {
            scroller = this._createYScrollNode();

            table.wrap(scroller);

        }

        this._uiSetYScrollHeight(boundingBox.get('offsetHeight'));
        this._uiSetYScrollWidth(width);

        if (captionTable) {
            captionTable.setStyle('width', scroller.get('offsetWidth') + 'px');
        }

        // Allow headerless scrolling
        if (thead && !fixedHeader) {
            fixedHeader = this._createYScrollHeader();

            contentBox.prepend(fixedHeader);

            this._syncScrollHeaders();
        }

        if (fixedHeader) {
            fixedHeader.setStyle('top', scroller.get('offsetTop') + 'px');

            if (!scrollbar) {
                scrollbar = this._createScrollbar();

                this._bindScrollbar();

                contentBox.prepend(scrollbar);
            }

            this._syncScrollColumnWidths();
            this._uiSetScrollbarHeight();
            this._uiSetScrollbarPosition();
        }
    },

    /**
    Assigns the appropriate class to the `boundingBox` to identify the DataTable
    as horizontally scrolling, vertically scrolling, or both (adds both classes).

    Classes added are "yui3-datatable-scrollable-x" or "...-y"

    @method _uiSetScrollable
    @protected
    **/
    _uiSetScrollable: function () {
        this.get('boundingBox')
            .toggleClass(this.getClassName('scrollable','x'), this._xScroll)
            .toggleClass(this.getClassName('scrollable','y'), this._yScroll);
    },

    /**
    Updates the virtual scrollbar's height to avoid overlapping with the fixed
    headers.

    @method _uiSetScrollbarHeight
    @protected
    **/
    _uiSetScrollbarHeight: function () {
        var scrollbar   = this._scrollbarNode,
            scroller    = this._yScrollNode,
            fixedHeader = this._yScrollHeader;

        if (scrollbar && scroller && fixedHeader) {
            scrollbar.get('firstChild').setStyle('height',
                this._tbodyNode.get('scrollHeight') + 'px');

            scrollbar.setStyle('height', 
                (scroller.get('clientHeight') -
                 fixedHeader.get('offsetHeight')) + 'px');
        }
    },

    /**
    Updates the virtual scrollbar's placement to avoid overlapping the fixed
    headers or the data table.

    @method _uiSetScrollbarPosition
    @protected
    **/
    _uiSetScrollbarPosition: function () {
        var scrollbar   = this._scrollbarNode,
            scroller    = this._xScrollNode || this._yScrollNode,
            fixedHeader = this._yScrollHeader,
            scrollbarWidth = Y.DOM.getScrollbarWidth(),
            top;

        if (scrollbar && scroller) {
            if (fixedHeader) {
                top = (fixedHeader.get('offsetHeight') +
                       fixedHeader.get('offsetTop')) + 'px';
            } else {
                top = (scroller.get('offsetTop') +
                    parseInt(scroller.getComputedStyle('borderTopWidth'), 10)) +
                    'px';
            }

            scrollbar.setStyles({
                top : top,
                left: (scroller.get('offsetWidth') - scrollbarWidth -
                      parseInt(scroller.getComputedStyle('borderRightWidth'), 10)) + 'px'
            });
        }
    },

    /**
    Assigns the height to the `<div>` wrapper around the data table for
    vertically scrolling tables.

    @method _uiSetYScrollHeight
    @param {Number} height The pixel height of the container
    @protected
    **/
    _uiSetYScrollHeight: function (height) {
        var scroller = this._yScrollNode,
            offsetTop = scroller.get('offsetTop'),
            // because IE6 is returning clientHeight 0 initially *grumble*
            borderWidth =
                (parseInt(scroller.getComputedStyle('borderTopWidth'), 10)|0) +
                (parseInt(scroller.getComputedStyle('borderBottomWidth'),10)|0);

        scroller.setStyle('height', (height - offsetTop - borderWidth) + 'px');
    },

    /**
    Assigns the width of the `<div>` wrapping the data table in vertically
    scrolling tables.

    If the table can't compress to the specified width, the container is
    expanded accordingly.

    @method _uiSetYScrollWidth
    @param {String} width The CSS width to attempt to set
    @protected
    **/
    _uiSetYScrollWidth: function (width) {
        var scroller = this._yScrollNode,
            table    = this._tableNode,
            tableWidth, borderWidth, scrollerWidth, scrollbarWidth;

        if (scroller && table) {
            scrollbarWidth = Y.DOM.getScrollbarWidth();

            if (width) {
                if (width.slice(-1) === '%') {
                    this._bindScrollResize();
                } else {
                    this._unbindScrollResize();
                }

                // Assumes no table border
                borderWidth = scroller.get('offsetWidth') -
                              scroller.get('clientWidth') -
                              scrollbarWidth;

                // The table's rendered width might be greater than the
                // configured width
                scroller.setStyle('width', width);

                // Have to subtract the border width from the configured width
                // because the scroller's width will need to be reduced by the
                // border width as well during the width reassignment below.
                scrollerWidth = scroller.get('clientWidth') - borderWidth;

                // Assumes no table borders
                table.setStyle('width', scrollerWidth + 'px');

                tableWidth = table.get('offsetWidth');

                // Expand the scroll node width if the table can't fit.
                // Otherwise, reassign the scroller a pixel width that
                // accounts for the borders.
                width = (tableWidth + scrollbarWidth) + 'px';
                scroller.setStyle('width', width);
                //this._uiSetDim('width', width);
            } else {
                this._unbindScrollResize();

                // Allow the table to expand naturally
                table.setStyle('width', '');
                scroller.setStyle('width', '');

                scroller.setStyle('width',
                    (table.get('offsetWidth') + scrollbarWidth) + 'px');
            }
        }
    },

    /**
    Detaches the scroll event subscriptions used to maintain scroll position
    parity between the scrollable `<div>` wrapper around the data table and the
    virtual scrollbar for vertically scrolling tables.

    @method _unbindScrollbar
    @protected
    **/
    _unbindScrollbar: function () {
        if (this._scrollbarEventHandle) {
            this._scrollbarEventHandle.detach();
        }
    },

    /**
    Detaches the resize event subscription used to maintain column parity for
    vertically scrolling tables with percentage widths.

    @method _unbindScrollResize
    @protected
    **/
    _unbindScrollResize: function () {
        if (this._scrollResizeHandle) {
            this._scrollResizeHandle.detach();
            delete this._scrollResizeHandle;
        }
    }

    /**
    Indicates horizontal table scrolling is enabled.

    @property _xScroll
    @type {Boolean}
    @default undefined (not initially set)
    @private
    **/
    //_xScroll: null,

    /**
    Indicates vertical table scrolling is enabled.

    @property _yScroll
    @type {Boolean}
    @default undefined (not initially set)
    @private
    **/
    //_yScroll: null,

    /**
    Fixed column header `<table>` Node for vertical scrolling tables.

    @property _yScrollHeader
    @type {Node}
    @default undefined (not initially set)
    @protected
    **/
    //_yScrollHeader: null,

    /**
    Overflow Node used to contain the data rows in a vertically scrolling table.

    @property _yScrollNode
    @type {Node}
    @default undefined (not initially set)
    @protected
    **/
    //_yScrollNode: null,

    /**
    Overflow Node used to contain the table headers and data in a horizontally
    scrolling table.

    @property _xScrollNode
    @type {Node}
    @default undefined (not initially set)
    @protected
    **/
    //_xScrollNode: null
}, true);

Y.Base.mix(Y.DataTable, [Scrollable]);

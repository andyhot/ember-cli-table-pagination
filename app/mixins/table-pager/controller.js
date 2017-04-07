import Ember from 'ember';
import Column from './column';
import pagedArray from 'ember-cli-pagination/computed/paged-array';

const { computed } = Ember;
const { alias } = computed;

/**
 * store shared logic to run pager logic
 */
export default Ember.Mixin.create({

  /**
   * This needs to be dynamic meta programming
   * for adding observers on each filter per column
   */
  configureFilterObservers: function () {
    var self = this;
    var observerDefinitions = {};
    var filterParams = {};
    this.get('columns').forEach(function (column, index) {
      var name = 'observer_' + column.get('apiInteractionName');
      observerDefinitions[name] = function () {
        var that = this;
        clearTimeout(this.get('keyTimer' + name));
        this.set('keyTimer' + name, setTimeout(function () {
          if (Ember.typeOf(column.get('filterValue')) !== 'undefined' && Ember.typeOf(column.get('filterValue')) !== 'null') {
            that.send('applyFilter', column.get('apiInteractionName'), column.get('filterValue'));
          }
        }, 600));
      }.observes('columns.' + index + '.filterValue');
      filterParams[column.get('apiInteractionName')] = null;
    });
    self.reopen(observerDefinitions);
    self.set('filterParams', filterParams);
  }.on('init'),

  // setup our query params including custom sortField value
  queryParams: ["page", "perPage", "sortField", "with"],

  pageList: [
    50, 100, 250
  ],

  // binding the property on the paged array
  // to the query params on the controller
  //pageBinding: "content.page",
  //perPageBinding: "content.perPage",
  totalPages: alias("content.totalPages"),

  observingPerPage: function () {
    this.set('page', 1);
  }.observes('perPage'),

  // //logic to handle sorting a list
  // sortField: computed('sortProperty', 'sortDirection', function() {
  //   let sortProperty = this.get('sortProperty');
  //   let sortDirection = this.get('sortDirection');
  //   Ember.Logger.debug('sortField being updated');
  //   if (sortDirection) {
  //     return `${sortDirection}${sortProperty}`;
  //   } else {
  //     return sortProperty;
  //   }
  // }),
  sortOrder: computed('sortDirection', function () {
    let sortDirection = this.get('sortDirection');
    if (sortDirection === 'desc') {
      return '-';
    } else {
      return '';
    }
  }),
  with: '',

  // disabled by default
  // set these in the controller to enable and bind to a specific field
  quickSearchField: null,
  quickSearch: null,

  page: 1,
  perPage: 50,
  totalRecords: null,

  infiniteContent: pagedArray('content', {infinite: true}),

  column: Ember.Object.extend({
    display: null,
    field: null
  }),

  quickSearchChanged: function () {
    var self = this;
    clearTimeout(this.get('keyTimer'));
    this.set('keyTimer', setTimeout(function () {
      try {
        self.send('runQuickSearch');
      } catch (e) {
      }
    }, 600));
  }.observes('quickSearch'),

  //load pager specific variables
  columns: [
    Column.create({'displayName': '#', 'fieldName': 'id'})
  ],

  // bootstrap or adminlte specific classes
  // color default|success|primary|warning|danger|info
  box: 'default',
  button: 'default',

  // display the table title if there is one
  tableTitle: 'set tableTitle in controller to NULL to hide otherwise set this to your table title',

  // where should the default open action link-to?
  linkPath: false,
  editPath: false,

  // not sure what this is
  createPath: "set createPath in the controller",

  canLoadMore: false,

  selectedRows: [],

  actions: {
    loadNext () {
      if (this.get('infiniteContent.length') > 0 && this.get('canLoadMore')) {
        this.get('infiniteContent').loadNextPage();
        this.set('page', this.get('infiniteContent.page'));
      }
    },

    editFlag (row) {
      this.set('isEditingFlagNote', true);
      this.set('flaggingRecord', row.content);
    },

    saveFlag(){
      let row = this.get('flaggingRecord');

      let subject = this.store.peekRecord('subject', row.id);

      subject.set('flagNote', row.flagNote);

      if (Ember.isEmpty(row.get('flagNote'))) {
        subject.set('flagStatus', 'unflagged');
      } else {
        subject.set('flagStatus', 'flagged');
      }
      subject.save().then(() => {
        this.get('notify').success('Saved successfully');
      }).then((result) => {
        if (Ember.isEmpty(row.get('flagNote'))) {
          row.set('flagStatus', 'unflagged');
        } else {
          row.set('flagStatus', 'flagged');
        }

        this.set('isEditingFlagNote', false);
        this.set('flaggingRecord', null);
      });
    },

    cancelFlag () {
      this.set('isEditingFlagNote', false);
      this.set('flaggingRecord', null);
    },
  }
});

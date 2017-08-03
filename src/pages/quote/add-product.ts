import { Component } from '@angular/core';
import { NavController, NavParams, ToastController, PopoverController } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { DescriptionPopover } from "./description-popover";

@Component({
    selector: 'add-product',
    templateUrl: 'add-product.html'
})
export class AddProduct {
    

    public quoteId: any;
    public catalog: any;
    public group: any;
    public model: any;
    public option: any;

    private isEditingProduct: boolean;
    public editProduct_quoteline: any; // when editing product
    public editProduct_catalog: any;

    public selectedSection: string;
    public pageTitle: string;

    public catalogs: any;
    public groups: any;
    public models: any;
    public optionsGroupList: any;

    public modelImages: any;
    public optionsImage: any;

    public expandedOptions: any;

    public visitedPages: any

    public errorId: string;
    public errors: any[];



    constructor(public navCtrl: NavController,
        public params: NavParams,
        public localDataService: LocalDataServiceProvider,
        private toastCtrl: ToastController,
        private popoverCtrl: PopoverController) {

        this.quoteId = params.get('quoteId');
        this.editProduct_quoteline = params.get('quotelineInstance');
        this.editProduct_catalog = params.get('catalog');

        this.pageTitle = "SELECT PRODUCT CATALOG";
        this.selectedSection = 'catalogs';

        this.errorId = '';
        this.errors = []

        this.visitedPages = {
            catalogs: true,
            groups: false,
            models: false,
            options: false
        };
        this.loadData();

        //
        // EDITING PRODUCT
        //
        this.isEditingProduct = false;
        if(this.editProduct_quoteline){
            this.pageTitle = "SELECT PRODUCT OPTION";
            this.isEditingProduct = true;
            this.catalog = params.get('catalog');
            this.doEditProduct();
        }

    }

    loadData() {

        this.localDataService.getCatalogs()
            .then((data) => {
                this.catalogs = data;
            })
    }

    selectCatalog(id) {

        this.localDataService.getCatalog(id).then(res => {

            this.catalog = res;
            this.localDataService.getCatalogProductGroups(this.catalog.id, this.catalog.root_product_group)
                .then(data => {
                    this.groups = data;
                });

            this.pageTitle = "SELECT PRODUCT GROUP";
            this.selectedSection = 'groups';
            this.visitedPages['groups'] = true;
            console.log(id);

        });

    }

    selectGroup(group) {
        this.group = group;

        // when leaf
        if (group.products !== undefined) {
            this.localDataService.getCatalogProducts(this.catalog.id, group.id)
                .then(data => {

                    this.models = data;
                    this.modelImages = [];
                    var _self = this;

                    // get base 64 images of models
                    for (let i = 0; i < this.models.length; i++) {
                        this.localDataService.getImage(this.models[i].image)
                            .then(str => {
                                debugger;
                                _self.modelImages.push(str);
                            });
                    }
                });
            this.pageTitle = "SELECT PRODUCT MODEL";
            this.visitedPages['models'] = true;
            this.selectedSection = 'models';
        } else {
            // when another menu
            this.localDataService.getCatalogProductGroups(this.catalog.id, group.id)
                .then(data => {
                    this.groups = data;
                });
        }

    }

    doEditProduct(){

        // TODO - resolve issue - Catalogs have the same guid, so we cannot identify the correct
        // catalog in which to find the OrderCode (item.id) 
        this.catalog.id = 'xxa0000000000001';

        this.localDataService.getCatalogItem(this.catalog.id, this.editProduct_quoteline.OrderCode).then(res => {

            let model: any = res;
            if(!model){
                // the selected catalog does not contain the OrderCode, or the catalog does not exist
                // 
                let toast = this.toastCtrl.create({
                    message: 'Cannot edit product. Original Catalog not found.',
                    duration: 3000,
                    position: 'top'
                });
                toast.present();
                this.navCtrl.pop();
            }
            else{
                this.selectModel(model);
            }
        });

    }

    selectModel(model) {

        this.model = model;
        this.optionsGroupList = null;

        this.localDataService.getCatalogProductOptionsFlattened(this.catalog.id, this.model.root_option_group)
            .then(data => {

                this.optionsGroupList = data;

                var _self = this;

                // get image for screen
                this.localDataService.getImage(this.model.image)
                    .then(str => {
                        debugger;
                        _self.optionsImage = str;
                    });

                // get expanded options
                for (let i = 0; i < this.optionsGroupList.length; i++) {

                    this.optionsGroupList[i].selected = false;
                    this.optionsGroupList[i].userSelection = {};
                    /*
                    this.localDataService.stub_getCatalogProductOptionGroupsExpanded(null, null, this.optionsGroupList[i].id)
                        .then((data) => {
                            console.log(data);
                            // Assign suboptions and boolean variable for selection
                            _self.optionsGroupList[i].expandedInfo = data;
                            _self.optionsGroupList[i].selected = false;
                            _self.optionsGroupList[i].userSelection = {};
                        });
                    */
                }
                console.log(this.optionsGroupList);
            })
        this.pageTitle = "SELECT PRODUCT OPTION";
        this.visitedPages['options'] = true;
        this.selectedSection = 'options';

    }

    selectOption(id) {
        this.pageTitle = "???";

    }

    toggleExpandedOption(optionIndex) {
        this.optionsGroupList[optionIndex].selected = !this.optionsGroupList[optionIndex].selected;
        /*
        this.localDataService.stub_getCatalogProductOptionGroupsExpanded(null, null, this.optionsGroupList[optionIndex].id)
            .then((data) => {
                console.log(data);
                this.optionsGroupList[optionIndex].expandedInfo = data;
            });
        */
        console.log(this.optionsGroupList);

    }

    markRadioSelection(option, input) {
        if (option.user_input === input) {
            option.user_input = null;
        } else {
            option.user_input = input;
        }
    }

    markMultipleSelection(option, input) {
        if(!option.user_input){
            option.user_input = [];
        }
        if (option.user_input && option.user_input.includes(input)) {
            let i = option.user_input.indexOf(input);
            option.user_input.splice(i, 1);
        } else {
            option.user_input.push(input);
        }
    }

    cancelAndExit() {
        this.navCtrl.pop();
    }

    saveAndExit() {
        let quoteID = this.quoteId;
        
        if (this.optionsGroupList === null || this.optionsGroupList === undefined) {
            let toast = this.toastCtrl.create({
                message: 'Select options for your Product first',
                duration: 3000,
                position: 'top'
            });
            toast.present();
            return;
        }

        this.localDataService.addProductToQuote(quoteID, this.optionsGroupList)
            .then(data => {
                // For debuging
                console.log(this.optionsGroupList);

                let result: any = data; // Fix for ts compiler error

                if(result.type=='success'){

                    this.navCtrl.pop();

                    // Show toast with results
                    let toast = this.toastCtrl.create({
                        message: result.message,
                        duration: 3000,
                        position: 'top'
                    });
                    toast.present();
                }
                else{
                    this.errors = result.optionErrors; // Assign errors

                    // Show toast with results
                    let toast = this.toastCtrl.create({
                        message: 'Incompatible Options Detected',
                        duration: 3000,
                        position: 'top'
                    });
                    toast.present();
                }

                // If error
                if (result.optionId !== undefined) {
                    this.errorId = result.optionId;
                }

            });

    }

    goToPage(pageName) {
        if (this.visitedPages[pageName]) {
            this.selectedSection = pageName;
        }
    }

    showDescription(description) {
        console.log(description);
        let popover = this.popoverCtrl.create(DescriptionPopover, { description: description });
        popover.present({
            ev: description
        });
    }

    getErrorMessage(id) {
        for (let i = 0; i < this.errors.length; i++) {
            if (this.errors[i].optionId === id) {
                return this.errors[i].message;
            }
        }
        return 'Invalid Input' 
    }

    hasError(id) {
        if(this.errors){
            for (let i = 0; i < this.errors.length; i++) {
                if (this.errors[i].optionId === id) {
                    return true;
                }
            }
        }
        return false; 
    }


}
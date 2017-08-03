import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { LocalDataServiceProvider } from '../../providers/local-data-service/local-data-service';
import { OpportunityDetails } from "../opportunity/opportunity-details";
import { ProductSummary } from './product-summary';
import { AddProduct } from "./add-product";

@Component({
  selector: 'quote-details',
  templateUrl: 'quote-details.html'
})
export class QuoteDetails {

  public quoteId: any;
  public secondParam: any;
  public quote: any;
  public visibleFields: any;
  public editableFields: any;
  public visibleFieldsLabels: any;

  constructor(public navCtrl: NavController,
    public params: NavParams,
    public localDataService: LocalDataServiceProvider) {

    this.quoteId = params.get("quoteId");
    this.loadData();

  }

  loadData() {
    
    if(!this.quoteId){
      return;
    }

    console.log('QuoteDetails: '+this.quoteId);
    this.localDataService.getQuoteSummary(this.quoteId)
      .then(data => {
        this.quote = data;
      });

    this.localDataService.getSummaryLayout('quote', this.quoteId)
      .then(data => {
        this.visibleFields = data;

        // Now create array of labels to be accesed with "*ngFor"
        let labels = [];
        Object.keys(data).forEach((key) => {
          console.log(key, data[key]);
          labels.push({
            //asCamelCase: key,
            asCamelCase: data[key].name,
            name: data[key].label
            //name: this.undoCamelCase(key),
          })
        });

        let column, res = {}

        // determine editable fields
        for(var i=0; i<data.length; i++){

          column = data[i];
          if(column.updateable){

            if(column.restrictedPicklist){
              res[column.name] = {
                type: 'selection',
                options: column.picklistValues,
                value: this.quote[column.name]
              }
            }
            else{
              res[column.name] = {
                type: 'text',
                options: null,
                value: this.quote[column.name]
              }
            }


          }

        }
        
        this.editableFields = res;

        this.visibleFieldsLabels = labels;

      });
      
  }

  markSelection(label, option) {
    if (this.editableFields[label].value === option) {
      this.editableFields[label].value = '';
    } else {
      this.editableFields[label].value = option;
    }

  }

  undoCamelCase(str): string {
    let tmp = str.replace(/([A-Z])/g, " $1");
    return tmp.charAt(0).toUpperCase() + tmp.slice(1);
  }

  isEditable(label): boolean {

    if(!this.editableFields) return;

    let editableFields = Object.keys(this.editableFields);
    if (editableFields.indexOf(label.asCamelCase) > -1) {
      return true;
    }
    return false;

  }

  isTextField(label): boolean {
    if (this.editableFields[label.asCamelCase].type === 'text') {
      return true;
    }
    return false;
  }

  isBooleanValue(value): boolean {
    return typeof value == 'boolean';
  }

  isBooleanField(label): boolean {
    if (this.editableFields[label.asCamelCase].type === 'boolean') {
      return true;
    }
    return false;
  }

  isSelectField(label): boolean {
    if (this.editableFields[label.asCamelCase].type === 'selection') {
      return true;
    }
    return false;
  }

  goToOpportunity() {
    this.navCtrl.push(OpportunityDetails, {
      opportunityId: this.quote.opportunityId
    });
  }

  goToProducts() {
    this.navCtrl.push(ProductSummary, {
      quote: this.quote
    });
  }

  goToAddProduct() {
    this.navCtrl.push(AddProduct, {
      quoteId: this.quote.Id
    });
  }

  reset() {
    this.loadData();
  }

  saveChanges() {
    
    let quoteDelta: any = {};
    let quoteId = 0;

    for(var i=0; i<this.editableFields.length; i++){
        quoteDelta[this.editableFields[i].name] = this.editableFields[i].value;
    }

    debugger;
  }


}
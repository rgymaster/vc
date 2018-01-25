# vc

> Vue components framework (async load without webpack)

##### [Demo1](https://jscript.pro) [Demo2](https://feasti.me)
    
### Warning

>Use not official [Single File Components](https://vuejs.org/v2/guide/single-file-components.html). 
>- `<script>` part must be modified. 
>- `<style>` part is not supported.

```` vue
<template>
    <p>{{ greeting }} World!</p>
</template>

<script>
    (function () {
        return {
            data: function () {
                return {
                    greeting: 'Hello'
                }
            }
        }
    })();
</script>
````

### Introduction

`vc` is a simple framework for creating lightweight Single Page Applications

- data update
- async load of components without webpack
- nested route/view mapping
- modal view support
- localStorage support

### Use

``` javascript
// vue.js and vc.js must be included above
Vue.use(VC, options)
```

#### options

- url

```` javascript
// produced url will be: prefix + 'componentName' + postfix
url: {
    prefix: 'prefix in path to components library',
    postfix: 'postfix in path to components library' //optional
}
````

- app

```` javascript
// it's Vue instance component name
// this component will be mounted to tag with the same name
app: 'app-name' //optional
````

- vc

```` javascript
// it's list of component names for async load
// include here only those, which not used in routes
vc: ['component1', 'component2', ...] //optional
````

- routes

```` javascript
// it's routes tree
routes: {
   base: 'pathToAppRoot', //optional, used if App isn't in the root of the host 
   items: [
       {
           name: 'routeName', 
           path: 'routePath', //to set parameter with name prm1 use [prm1]
           vc: 'componentName', 
           nav: { //optional, used to create a menu
               ind: 10, //order index
               name: 'menuOptionName' //optional, instead of routeName
           }, 
           title: 'routeDocumentTitle', 
           items: [subRoute1, subRoute2, ...] //optional, list of sub-routes
       }, 
       {}, 
       ...
   ],
   callback: function (details) { //optional, when changing a route
       //for example, it can be used with trackers
       window.gtag('config', 'UA-your-code', {'page_path': details.path});
   }
````

- debug

```` javascript
// use it to Errors inspection
debug: Boolean //optional
````

### Mixed data

#### vc

```` javascript
vc: {
    modal: modalComponentData,
    view: {
        content: 'contentComponentName',
        modal: 'modalComponentName'
    },
    routes: {
        nav: Array, //data to create menu
        current: {
            name: 'routeName',
            prm: routeParameters //optional
        }
    }    
}
````

### Mixed components

#### none

It's rendered to empty `div`

#### vc-link

```` html
<!-- for route with name="routeName" and path="/section/[id]" and id=123 -->

<vc-link to="routeName" prm="{\"id\"=123}">Example</vc-link>

<!-- will be rendered to -->

<a href="[pathToAppRoot]/section/123">Example</a>
````

### Mixed methods

#### update

This method is used to manage data in the `localStorage` or an external server. 
It can be used to implement a modal interface (alerts for example).

```` javascript
this.update({
    method: 'methodName',
    url: 'url',
    data: data,
    _vc: _vc_options
});
````

>Features of setting parameters for working with `localStorage` see below in localStorage section

##### _vc_options

Each request goes through a minimum of 3 stages, which can be configured using `_vc_options`.

- before execution

```` javascript
//will be used the modal interface to prepare your data or confirm request
beforeExec: {
    vc: 'componentName',
    ui: dataUI //user data to specify component view
}
````

- update component data source

```` javascript
storage: storage, //somewhere in the component data source tree
property: 'property' //property of storage to update data
````

- after execution

```` javascript
//it's useful, for example, if it was created something new
afterExec: {
    route: {
        name: 'routeName',
        prm: routePathParameters //optional
    }
}
````

#### response

This method is used to obtain the result from the components of the modal view. 
To cancel the request, send false.

```` javascript
this.response(mayBeModifiedData || false)
````

#### route

```` javascript
this.route({
    name: 'routeName',
    prm: routePathParameters //optional
})
````

### Content view

Component of the current route can be set this way

```` html
<app-content :is="vc.view.content"></app-content>
````

### Modal view

Component of the modal view can be set this way


```` html
<app-modal :is="vc.view.modal"></app-modal>
````

Current data is available in

```` javascript
this.vc.modal
````

Implementation of the modal interface to alerts

```` javascript
// without url
this.update({
    vc: 'componentName',
    ui: dataUI //user data to specify the component view
});
````

### localStorage

>Your data to store in `localStorage` must be `Object` or `Array`.

You can manage data in the `localStorage` using the `update` method.
You must specify its parameters in accordance with these rules:

- url

```` javascript
url: 'local://dataObjectName[/propertyName]'
````

- method

    - INIT
    
        Use this to synchronize your component's data with `localStorage`. 
        If `localStorage` does not have this data, it will be stored there, 
        otherwise they will be used to update the component data.
    
    - CREATE
    
        A new property will be created in your data. 
        For `Object`, you need to specify its name. 
        For `Array`, it will be placed at the end.
        >For `Array`, you can sort it this way
        ```` javascript
        ...
        this.update({
            ...
            _vc: {
                ...
                sort: function(a, b){
                    //your logic here
                },
                ...
            }
        });
        ````
        
    - UPDATE
    
        Property name must be specified.
        
    - DELETE
    
        Property name must be specified.
        
[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018 KovchugoAF
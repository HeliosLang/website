# Structs

A struct in Helios is a named grouping of types (sometimes called a [*product type*](https://en.wikipedia.org/wiki/Product_type)). They are similar to structs in other languages (e.g. C, Go and Rust):

```helios
// example of a Rational (fractional type)
struct Rational {
    top:    Int
    bottom: Int
}
```

> **Note**: a struct can't be empty and must have at least one field.

## Instantiating a struct

A struct can be instantiated using the following literal syntax:

```helios
x = Rational { 1, 3 }
```

The fields can also be named:

```helios
x = Rational { bottom: 3, top: 1 }
```

## Methods

You can define methods for structs. The syntax for this is similar to many OOP languages: methods are defined by placing `func` statements inside a `struct` block.

The first argument of a method must be named `self` and doesn't have a type annotation. `self` implicitly has the type of the struct itself:
```helios
struct Rational {
    top:    Int
    bottom: Int

    func add(self, rhs: Rational) -> Rational {
        top    = (self.top * rhs.bottom) + (rhs.top * self.bottom)
        bottom = self.bottom * rhs.bottom

        Rational { top, bottom }
    }
}

const a = Rational { 1, 2 }
const b = Rational { 1, 4 }

const result = a.add(b) // == Rational{6, 8}
```

Methods are accessed using a `.` (i.e. a dot). Methods cannot modify `self` as all Helios values are immutable (instead they should return new instantations of the own type).

> **Note**: `self` is a reserved word and can only be used for the first argument of a method.

> **Note**: methods within the same struct scope can call eachother in any order (mutual recursion).

### Methods can be used as values
A method is syntactic sugar for a **curried function** (a function that returns a function) that takes `self` as it's first argument.

A method value is a function, and can be seen as a closure over `self`.

```helios
a = Rational{1, 2}
b = Rational{1, 4}

add_to_a: (Rational) -> Rational = a.add

// add_to_a(b) == a.add(b) == Rational{6, 8}
```


## Associated functions and constants

Associated functions (aka *static methods*) and constants are just like regular functions or constants but are also namespaced by a type, for example `Rational::new(top, bottom)`.

### Defining associated functions and constants

Associated functions are defined just like methods but without the `self` argument. Associated constants are simply `const` statements inside `struct` blocks:

```helios
struct Rational {
    top:    Int
    bottom: Int

	// associated const
	const PI = Rational { 355, 113 }

	// associated function
	func new(top: Int, bottom: Int) -> Rational {
		Rational { top, bottom }
	}
}
```

### Using associated functions and constants

Associated functions and constants are *namespaced* by the type they are associated with
and can be referenced using a double colon (`::`) just like in Rust.
For example:

```helios
half = Rational::new(1, 2)
```

## Encoding

Helios structs with 0, or 2 or more fields, are encoded as data lists. Helios structs with only a single entry use the encoded entry directly.

If any field is tagged, the struct is encoded as a data map with utf-8 encoded keys.

### Field tagging

This internal data-list format isn't convenient for datums that are intended for public reading/writing. For such applications it is recommended to use the [CIP 68](https://cips.cardano.org/cips/cip68/) data-map format.

Helios will automatically use the data map format internally if any `struct` field is tagged. The tags are internally converted into the data-map keys.

```helios
struct TaggedRational {
    top:    Int "@top"     // the tag can be any valid utf-8 string
    bottom: Int "@bottom"
}
```

Any missing tags default to the field name:

```helios
struct TaggedRational {
    top:    Int "@top"
    bottom: Int         // data-map key will be "bottom"
}
```

Field tagging isn't available for [enum](./enums.md) variants.

## Example: `Rational`

The following is a complete example of a struct with both associated functions and regular methods.

```helios
struct Rational {
    top:    Int "@top" // use tags for easy inspection of the encoded data using external tools
    bottom: Int "@bottom"

    // associated const
    const PI = Rational{ 355, 113 }

    // associated function
    func new(top: Int, bottom: Int) -> Rational {
        Rational { top, bottom }
    }

    // regular method
    func add(self, rhs: Rational) -> Rational {
        top:    Int = (self.top * rhs.bottom) + (rhs.top * self.bottom);
        bottom: Int = self.bottom * rhs.bottom;

        Rational { top, bottom }
    }
}

...

rational_1 = Rational::PI // 355/113 or 3.14159...
rational_2 = Rational::new(1, 2) // 1/2 or 0.5
rational_3 = rational_1.add(rational_2) // 823/226 or 3.64159...
rational_4 = rational_3.one() // 226/226
```
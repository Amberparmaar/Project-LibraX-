import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../firebase/firebase-config.js";

// 1. Add book
export async function addBook(bookData) {
  try {
    const docRef = await addDoc(collection(db, "books"), {
      title: bookData.title,
      author: bookData.author,
     
      isbn: bookData.isbn,
      category: bookData.category,
      totalCopies: parseInt(bookData.totalCopies),
      availableCopies: parseInt(bookData.totalCopies),
      description: bookData.description,
      coverImage: bookData.coverImage || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 2. get all books
export async function getAllBooks() {
  try {
    const q = query(collection(db, "books"), orderBy("title"));
    const snapshot = await getDocs(q);
    const books = [];
    snapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, books };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 3. filter title and auther
export async function searchBooks(searchTerm) {
  try {
    const allBooksResult = await getAllBooks();
    if (!allBooksResult.success) return allBooksResult;
    
    const filtered = allBooksResult.books.filter(book =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn.includes(searchTerm)
    );
    
    return { success: true, books: filtered };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. UPDATE BOOK
export async function updateBook(bookId, bookData) {
  try {
    const bookRef = doc(db, "books", bookId);

    await updateDoc(bookRef, {
      title: bookData.title,
      author: bookData.author,
      price: bookData.price || "",
      isbn: bookData.isbn || "",
      category: bookData.category,
      totalCopies: parseInt(bookData.totalCopies) || 0,
      availableCopies: parseInt(bookData.availableCopies) || 0,
      description: bookData.description || "",
      coverImage: bookData.coverImage || "",
      updatedAt: new Date()
    });

    return { success: true };

  } catch (error) {
    console.error("Update Book Error:", error);
    return { success: false, error: error.message };
  }
}


// 5 DELETE 
export async function deleteBook(bookId) {
  try {
    await deleteDoc(doc(db, "books", bookId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 6. Available 
export async function getAvailableBooks() {
  try {
    const allBooksResult = await getAllBooks();
    if (!allBooksResult.success) return allBooksResult;
    
    const available = allBooksResult.books.filter(book => book.availableCopies > 0);
    return { success: true, books: available };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
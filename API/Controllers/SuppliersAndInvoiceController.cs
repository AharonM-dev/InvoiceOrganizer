// קובץ זה מכיל בקרי API
//  1) CRUD – SuppliersContrller לספקים

using API.Data;  //  AppDBContext: שער EF CORE למסד נתונים
using API.Entities; //  ישויות  (Supplier, Invoice)
using Microsoft.AspNetCore.Mvc; // ControllerBase, ניתוב, Actionresult<>
using Microsoft.EntityFrameworkCore; // כלים של EF core

namespace API.Controllers;

[ApiController]     // פונקציה שמאפשרת מוסכמות של הapi (לדוגמא: קשירה, ולידציהinvalid, החזרת 400 אוטומטית)
[Route("api/[controller]")]   // זה הנתיב בסיס של ה- ,API , Base path =>כאן הנבתי הוא /api/suppliers ("[controller]" => בלי השם "Controller")
public class SuppliersController(AppDbContext db) : ControllerBase // הזרקת DbContext דרך ה- DI, DEPENDECY INJECTION, הזרקת תלות במקום שהמחלקה תייצר אובייקטים שהיא צריכה (כגון, מסד נתונים שירותים וכו') אלא מקבלת אותם מבחוץ בדרך כלל ע"י המנגנון של הפריימווארק, ואצלנו 
{
    // GET /api/suppliers   מחזירה רשימה של ספקים
    [HttpGet] //  ממפה בקשת GETמהקליינט  
              // זו אנוטציה (Attribute) של ASP.NET Core שמסמנת לפלטפורמה שהמתודה שמתחתיה תטפל בבקשות מסוג HTTP GET.

    public async Task<ActionResult<IEnumerable<Supplier>>> Get() // המתודה עובדת באופן אסינכורי וממתינה עד שהיא תקבל תוצאה מהבסיס נתונים 
                                                                 // TASK<> זה טיפוס החזרה של אסינכרוני
                                                                 // <ActionResult<IEnumerable<Supplier>>> זה מציין שהפעולה יחזיר פעולה  HTTP עם גוף שמכיל עם אוסף של אובייקטים מסוג Supplier.
     => await db.Suppliers // הכוונה ל- Dbset שבתוך ה AppDBContext שלנו הוא מייצג טבלה בשם Supplier במסד הנתונים כשכל שורה היא אובעעקט מסוג Supplier.  
       .AsNoTracking() // ברירת מחדל של ענטעטי פריימווארק היא לעקוב אחרי כל ישות שהיא טוענת מהמסד הנתונים, (כדי לדעת אילו שדות השתנו בהמשך, לצורך עדכון). אבל כאן שאנחנו רק שולפים מידע ולא עושים שינוי בהם.   .ASnoTracking זה פקודה שאומר ל EF   רק תביא הנתונים ואל תשמור עליהם מעקב זיכרון.
       .OrderBy(s => s.Name) // מסדר רשימת לפי השדה Name מיון עולה A-Z, זה מתבצעת במסד נתונים, כלומר ה      SQL שנשלח לשרת כולל   ORDER BY Name.
       .ToListAsync(); // מבצע בפועל את השאילתה מול הבמסד נתונים בצורה אסינכרונית ומחזירה התוצאה כ-  <List<Supplier. זה שאילתה כמו ב- SQL  SELECT * FROM Suppliers ORDER BY Name.




    // GET /api/suppliers/{id}    מחזירה ספק בודד עם החשבוניות שלו
    [HttpGet("{id:int}")] // הגבלה : id חייב להיות int.
    public async Task<ActionResult<Supplier>> GetOne(int id) // מתודה אסינכורית שמחזירה אובייקט אחד מסוג Supplier (או שגיאת 404 אם לא נמצא).
    {
        var s = await db.Suppliers  // מתחיל שאילתה על טבלת הספקים  Supplier.
       .Include(x => x.Invoices) // אומר לענטעטי פריימווארק לטעון גם את הרושמות הקשורות (חשבוניות) של כל ספק – במקום לטעון כל אחד בנפרד זה נקרא Eager-load-(טעינה מוקדמת)
       .FirstOrDefaultAsync(x => x.Id == id); // מוסיף תנאי "תביא הספק הראשון שמספר id, שלו תואם לפרמטר שהתקבל אם לא נמצא ספק מחזיר NULL.
        return s is null ? NotFound() : s; // אם לא נמצא ספק – מחזיר  not found 404 אחרת – מחזיר את האובייקט (שיחזור אוטומטית לג'ייסון).
    }
    
    
    
    
    [HttpPost] // בקשה לייצר נתונים חדשים  (HTTP POST)

public async Task<ActionResult> Create(Supplier dto) // פעולת אסינכרונית, הפעולה מחזירה תוצאה של  HTTP 200 OR 400 עם גוף מסוג  Supplier. Supplier dto – הפרמטר שמתקבל מגוף הבקשה ג'ייסון.
    {
            db.Suppliers.Add(dto); // מוסיף ספק חדש עבור INSERT 
            await db.SaveChangesAsync(); // המשך במסד הנתונים: ושמירה 
            return CreatedAtAction(nameof(GetOne), // מחזיר תשובת 201 +מיקום האובייקט  החדש ל- GET /api/suppliers/{id} ("URL").
            new { id = dto.Id }, dto); // שבסוף ה URL שהוא מחזיר יכלול גם המפסר ה- id.
    }
    // PUT /api/suppliers/{id} נתיב של ה PUT 
    [HttpPut("{id:int}")] // בקשת שינויים עדכונים למסד נתונים
    public async Task<IActionResult> Update(int id, Supplier dto)  //  זמינה לשימוש חיצוני ניגשים אליה דרך ה api הפונקציה רצה בדרך אסינכרונית במשימה זו
    {
            if (id != dto.Id) return BadRequest(); // בדיקה: אם ה id שנשלח בכתובת הבקשה תואם --ל id שבתוך הגוף הבקשה        dto.ID 
            db.Entry(dto).State = EntityState.Modified; // אומרים ל entity framework core ה  dto זה השדות של האובייקט השתנו או עדכנו ולעדכן אותם במסד נתונים זה כמו UPDATE  ב  SQL.
            await db.SaveChangesAsync(); // שמירת העדכון במסד הנתונים
            return NoContent(); // מחזיר תשובה  HTTP 204 שמשעותה הבקשה בוצעה בהצלחה בלי תשובה מפורטת.
    }
        // DELETE /api/suppliers/{id} זה מבנה של הנתיב וה id ב  int
        [HttpDelete("{id:int}")] //  זה אטריביוט שמגדיר שהמתודה הזו מטפלת בבקשות מסוג  HTTP DELETE.

    public async Task<IActionResult> Delete(int id)//  מתודה אסינכרונית המאפשר להחזיר תגובות שונות (כמו 400, 200 וכו').  Id הוא הפרמטר שרוצים למחוק.
        {
            var entity = await db.Suppliers.FindAsync(id); // חיפוש לפי מפתח ראשי ע"י ענטעטי פריימווארק שמחפש במסד הנתונים.          FindAsync היא הדרך היעילה לחיפוש לפי מפתח זר.

            if (entity is null) return NotFound(); // אם לא נמצא ספק מזוהה לא מתבצעת מחיקה ומחזיר תגובה 404 if not found 
            db.Suppliers.Remove(entity); // אם מצא הרשומה המזהה הפקודה אומר לענטעטי פריימווארק תסמן האובייקט  למחיקה מהמסד זה רק סימון 
            await db.SaveChangesAsync(); // כאן מתבצעת המחיקה 
            return NoContent(); // אם המחיקה עבר בהצלחה יציג הודעה  204 No Content –deleted
        }
}









[ApiController]  //  אומר ל־ASP.NET שהמחלקה הזו היא בקר API.
[Route("api/[controller]")]  // קובע את הנתיב הבסיסי של הבקר

//זהו constructor injection — מקבלים את:
public class InvoicesController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // AppDbContext db – זהו האובייקט שמייצג את חיבור המסד־נתונים (Database) שלך.     AppDbContext הוא מחלקה שנובעת מ־  DbContext של Entity Framework Core.  דרכו אפשר לגשת לטבלאות
    // IWebHostEnvironment env – מאפשר גישה לתיקיות ולסביבת האירוח (למשל לשמירת קבצים) זהו אובייקט שנותן מידע על סביבת ההרצה של האפליקציה, באמצעותו ניתן לדעת מה הנתיב הפיזי של האפליקציה, באיזו סביבה רצה, לגשת לקבצים סטטיים או ליצור נתיבים לקבצים..   
    // InvoicesController  יורש מ־  ControllerBase, בסיס לבקרי API
    [HttpGet]  // מקבל בקשת  GETמהקליינט  
    public async Task<ActionResult<IEnumerable<Invoice>>> Get(  //  // המתודה עובדת באופן אסינכורי וממתינה עד שהיא תקבל תוצאה מהבסיס נתונים 
                                                                // TASK<> מציין שהפעולה אסינכרונית ותחזיר תוצאה בעתיד
                                                                // ActionResult<...> - עטיפה שמאפשרת להחזיר גם - תוצאה תקינה (למשל רשימה) או שגיאת HTTP 404 ,
                                                                // <IEnumerable< Invoice >>> זה מציין שהפעולה יחזיר פעולה  HTTP עם גוף שמכיל עם אוסף של אובייקטים מסוג Invoice. מחזירה תגובה HTTP עם רשימת חשבוניות
    [FromQuery] int? supplierId,
    // אומר ל־ASP.NET לקחת את הערך מה־Query String של כתובת ה־URL, למשל GET /api/invoices?supplierId=5&year=2025&month=11.
    [FromQuery] int? year,
    [FromQuery] int? month)
    // אם המשתמש לא יספק אחד מהם, הפרמטר פשוט יהיה  null (כי הוא nullable).   
    // int? = סימן השאלה ? אחרי int אומר שזה nullable type.
    //כלומר, הערך יכול להיות מספר (int) או null. המשתמש לא חייב לציין אותם ב־URL.
    {

        // כאן יש צורך לבנות שאילתה דינמית לפי אילו פרמטרים המשתמש שלח (לדומא: זהות המשתשמש, שנה, או חודש)
        //  לכן יוצרים תחילה משתנה בשם q (קיצור של  query = שאילתה),שבתחילה מייצג את כל טבלת ה־  Invoices, ואז מוסיפים עליו תנאים בהמשך.
        var q = db.Invoices
            // q, הוא משתנה שמייצג שאילתה פתוחה (Queryable) על בסיס הנתונים  
            // טבלת ה־ Invoices בבסיס הנתונים. 
            .AsNoTracking()
           // קריאה בלבד, לא עוקב אחרי שינויים (ביצועים טובים יותר).
           .Include(i => i.Supplier)
            // טוען גם את האובייקט המשויך ל-  Supplier (יחס EF) תביא יחד גם את המידע של הספק דהיינו לכל חשבונית תביא פרטי ומידע על הספק כדי להימנע מסיבוב נוספת. Include משלב את הנתונים של שתי הטבלאות  Invoice and Supplier לשאילתה אחת.

            .AsQueryable();
        // זה ממשק שמייצג שאילתה שעדיין לא הורצה.
        // היא מבטיחה שהמשתנה  q יהיה מטיפוס   IQueryable<Invoice> —
        //לא רשימה בפועל, אלא שאילתה פתוחה שניתן להמשיך לבנות עליה תנאים וסינונים.
        // מאפשר להוסיף תנאים דינמיים (Where) בהמשך.

        // כאן מתחיל התנאים והסינונים
        if (supplierId.HasValue) q = q.Where(i => i.SupplierId == supplierId.Value);
        // סינון ספק לפי מספר זהות
        // קודם שואל אם המבקש שלח בתוך הבקשה שלו של "געט" שם משתמש עם ערך והוא לא ריק (נאלל), אם כן אז qיהיה שוה ל-  .  iהוא מייצג הזהות של כל החשבוניות שנמצא בטבלת החשבוניות. אז החזר רק החשבונית אם הזהות שסיפק המשתמש בבקשה שלו.
        if (year.HasValue) q = q.Where(i => i.InvoiceDate.Year == year.Value);
        // זה סינון לפי שנה
        if (month.HasValue) q = q.Where(i => i.InvoiceDate.Month == month.Value);
        // זה סינון לפי חודש

        return await q.OrderByDescending(i => i.InvoiceDate)
            // מחזיר החשבוניות לפי סדר מהחדש – ישן 
            .ToListAsync();
        // מפעיל את השאילתה בפועל ומחזיר רשימה אסינכרונית, היא הפקודה שמריצה את השאילתה בפועל מול בסיס הנתונים, שולחת את השאילתה שנבנתה למסד הנתונים
    }

    // GET /api/invoices/{id}   קבלת חשבוניות בודדות לפי id שלה. אז הנתיב של הבקשה כולל id.
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Invoice>> GetOne(int id)  // פקודה שיכול להחזיר או את האובייקט שהוא כרגע דבר אחד חשבונית בודדת או תשובת שגיאה.
    {
        var inv = await db.Invoices
      // inv, הוא משתנה שמייצג שאילתה פתוחה על בסיס הנתונים  
      // טבלת ה־ Invoices בבסיס הנתונים.
      .Include(i => i.Supplier)
      // לחשבונית תביא פרטי ומידע על הספק כדי להימנע מסיבוב נוספת
      .FirstOrDefaultAsync(i => i.Id == id);
        // ששולחת שאילתה למסד הנתונים ומחזירה את הרשומה הראשונה שתואמת לתנאי שהוגדר. היא מורכבת משני חלקים עיקריים: תחזיר את הרשומה  הראשונה שתואמת לתנאי, אם לא נמצאה אף רשומה – תחזיר  , null במקום לזרוק שגיאה
        return inv is null ? NotFound() : inv;
        // כאן מחזיר התובה למקש אם נאלל מחזיר נאלל ואם מצא מחזיר מה שמצא (404 or 200)
    }

    // יצירת חשבונית חדשה למסד נתונים
    // POST /api/invoices נתיב בקשת  POST
    [HttpPost] // כשמגיעה בקשת POST לנתיב של הבקר הזה — הפעל את המתודה הזו
    public async Task<ActionResult> Create(Invoice dto)  // מגדיר את המתודה 
    {
        // המתודה זמינה מחוץ למחלקה (נדרשת כדי שה־API יוכל לגשת אליה).
        // סוג הערך המוחזר: משימה שמחזירה תוצאה מסוג ActionResult<Invoice> (תגובה HTTP עם גוף מסוג Invoice).
        //  שם פעולה  CREATE – יצירה , הפרמטר dto הוא אובייקט מסוג  Invoice שמגיע מגוף הבקשה (body).
        //“Data Transfer Object” — אובייקט שמכיל את הנתונים שהלקוח שלח כדי ליצור רשומה חדשה (לדוגמה, JSON של חשבונית חדשה).   
        db.Invoices.Add(dto);   // db = DbContext אובייקט שמייצג את החיבור למסד הנתונים
                                // Invoices הוא ה DbSet שמייצג את הטבלת החשבוניות
                                // Add(dto); = תוסיף את האובייקט הזה (dto) למעקב של EF Core – הוא מועמד להוספה במסד הנתונים
        await db.SaveChangesAsync();
        //  זה הפקודה שאומר אחרי שהומר לsqlלשלוח את כל הנתונים למסד נתונים ולשמור אותם שם. 
        return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto); // 201 + Location 
                                                                          // מחזירה תגובה של  HTTP שמכילה גם הניתון החדש וגם את המיקום שלה.
                                                                          //  (nameof(GetOne)  מציין שם המתודה שתביא את המשאב הזה לפי ה- id 
                                                                          // new { id = dto.Id } מוסיף ל-  URL את ה- id שנוצר עכשיו לדומה  : api/invoices/42

        // dto =  הגוף של התגובה – הנתון עצמו שהתווסף למסד הנתונים
    }


    // בקשת עדכון
    // PUT /api/invoices/{id} נתיב שבו מזהה החשבונית לעדכון לפי ה- id
    [HttpPut("{id:int}")]  // מתאים רק לפרמטר של int.
    public async Task<IActionResult> Update(int id, Invoice dto)
    {
        // Update(int id, Invoice dto) = שם הפעולה + שתי משתנים
        // Invoice dto = האובייקט החדש שמגיע מגוף הבקשה שנשלח מהלקוח דרך JSON.

        if (id != dto.Id) return BadRequest(); // זה בדיקת הגנה שה-  id שב URL לא תואם ל-  id  שבגוף הבקשה ותחזיר שגיאה 400 עם הודעה BadRequest. 
        db.Entry(dto).State = EntityState.Modified; // תתייחס לאובייקט הזה (dto) כאילו הוא כבר קיים במסד הנתונים ותעדכן את כל הערכים שלו.
                                                    // db.Entry(dto) — מקבל את ה־ EntityEntry, כלומר את "העטיפה" של האובייקט  dto בתוך ה־  DbContext. 
                                                    // .State = EntityState.Modified — מסמן ל־ EF Core שכל השדות של האובייקט השתנו, וצריך לעדכן אותם במסד הנתונים.
        await db.SaveChangesAsync(); // כמו במתודת ה־ POST — כאן EF Core שומר בפועל את השינויים במסד הנתונים.
                                     // .SaveChangesAsync() שולח את פקודת ה־UPDATE ל־SQL Server (או כל DB אחר).   ואח"כ השרת מבצע את השינוי בפועל.
        return NoContent(); // 204 === זו התשובה הסופית ללקוח המשמעות - העדכון הצליח, בלי להחזיר גוף תשובה עם תוכן.
    }


    // היא תפעל כשיהי' בקשה למחוק חשבונית
    // DELETE /api/invoices/{id} 
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        // Delete(int id) ==  שם המתודה היא  DELETE , והיא מקבלת פרמטר id של החשבונית שהוא רוצה למחוק.
        var inv = await db.Invoices.FindAsync(id); // מחפש לפי המפתח ראשי  id כאן הוא המפתח ראשי 
                                                   // db.Invoices == הוא ה־ DbSet של החשבוניות בטבלת  Invoices במסד הנתונים.
                                                   // חשוב לדעת !!   FindAsync == מחפש רק לפי מפתח ראשי (פריימערי קי)
                                                   // הוא עושה שאילתה ומחפש את ה-  id ואם לא נמצא רשומה במסד הנתונים עם ה- ה id המתודה יחזיר  null.
        if (inv is null) return NotFound(); // כשחוזר מהחיפוש null מחזירים הודעה ללקוח שלא נמצא 404. 
        db.Invoices.Remove(inv);  // הכנה למחיקה
                                  // מסמן ל־ Entity Framework Core להסיר את הרשומה inv (החשבונית שמצאנו קודם) מה־ DbContext.  הוא לא מוחק את הרשומה מיד, אלא " מסמן" אותה למחיקה.
        await db.SaveChangesAsync(); //  כעת ה־EF Core מבצע את המחיקה בפועל במסד הנתונים.
                                     // השינויים שנעשו ב־DbContext (במקרה הזה, מחיקת הרשומה inv) מתבצעים על ידי SQL אמיתי.
        return NoContent(); // לאחר שנמחקה בהצלחה ועכשיו אין תוכן שולח הודעה - 204 
    }


    // העלאת קובץ לשרת דרך ה-  API
    // POST /api/invoices/upload (multipart/form-data: field name "file")  נתיב של בקשה להעלות קבצים ולעדכן אותם. 
    // multipart/form-data === זהו הפורמט הסטנדרטי להעלאת קבצים, (זהו הפורמט  הסטנדרטי להעלאת קבצים). 
    [HttpPost("upload")]  //   כאשר מגיע בקשה  POST עם העלאת קבצים.
    [RequestSizeLimit(50_000_000)] // זה מגדיר את גודל הקובץ שמותר להעלאה.
                                   //  כדי למנוע הפלת השרת בהעלאת קבצים גדולים מדי.
    public async Task<ActionResult<object>> Upload([FromForm] IFormFile file)
    {
        // object == מחזיר תוצאה של פעולת HTTPשעשויה להכיל אובייקט. 
        // Upload == העלאה 
        //  FromForm] IFormFile file === מציין שפרמטר  file מתקבל מגוף הבקשה form data בתור קובץ. 
        // IFormFile == הוא אובייקט מיוחד של ASP.NET שמייצג קובץ שנשלח בטופס — כולל, שם הקובץ, גודל הקובץ, תוכן הקובץ.
        if (file is null || file.Length == 0) return BadRequest("No file"); // בודק אם לא התקבל קובץ או קובץ ריקה, ואם כןמחזיר שגיאה 400    BadRequest 
        var uploadsDir = Path.Combine(env.ContentRootPath, "uploads"); //  כאן נוצר נתיב לתיקיית יעד שבה הקבצים יישמרו פיזית על הדיסק.
                                                                       // env. == הוא אובייקט מסוג  IWebHostEnvironment זה משתנה שהתקבל בקוסרוקטר למעלה  InvoicesController.
                                                                       // env.ContentRootPath == זוהי תכונה (property) של אותו  env שמחזירה את הנתיב הפיזי לתיקיית השורש של פרויקט ה־API.   לדוגמא :  env.ContentRootPath == "C:\\Projects\\InvoiceOrganizer"
                                                                       // "uploads"      זהו מחרוזת פשוטה שמייצגת שם של תיקייה שנרצה ליצור (או להשתמש בה) כדי לשמור את הקבצים המועלים 
                                                                       // Path.Combine === לחבר בצורה בטוחה שני חלקי נתיב (path), בלי שתצטרך לדאוג ל־\ או / בעצמך.
        Directory.CreateDirectory(uploadsDir);
        // Directory. == השורה הזו אם התיקייה לא קיימת יוצרת תיקייה (Directory) במערכת הקבצים של השרת – במקרה הזה, בתיקייה ששמורה במשתנה  uploadsDir.    Directory היא מחלקה סטטית (static class) מתוך המרחב System.IO     (קיצור של Input/Output).   CreateDirectory === יצירת תיקיות פיזית בדיסק 
        // uploadsDir == זה המשתנה שהוגדרנו מקודם. 
        var filename = $"{Guid.NewGuid()}_{file.FileName}";  //  כאן מייצרים שם קובץ ייחודי כדי למנוע מצב שבו שני משתמשים מעלים קבצים עם אותו שם
                                                             // Guid.NewGuid() יוצר מזהה ייחודי (כמו: f4a1c5c9-...).'
                                                             //  מוסיפים את השם המקורי של הקובץ (file.FileName) אחרי הקו התחתון _.
        var path = Path.Combine(uploadsDir, filename); //  כאן נוצרת כתובת מלאה של הקובץ על הדיסק — שילוב בין התיקייה לשם הקובץ מחבר את שתי משתנים לנתיב מלא. המטרה של השורה הזו היא לבנות נתיב קובץ מלא (Full File Path) במערכת הקבצים של השרת — כלומר, המקום המדויק שבו ישמר הקובץ שהועלה.
                                                       // Path.Combine( ) == זו מתודה סטטית של המחלקה System.IO.Path.        	היא מחברת חלקים של נתיב      (path segments) למחרוזת אחת —בצורה נכונה ובטוחה, לפי מערכת ההפעלה (Windows / Linux).
        await using var stream = System.IO.File.Create(path); // פותחים   Stream   (זרם נתונים) חדש לכתיבה — כלומר, יוצרים קובץ פיזי ריק במיקום שציינו ב- (path).
                                                              // System.IO.File.Create == יוצרת קובץ חדש במערכת הקבצים (בנתיב שכתוב במשתנה  path).   אם כבר קיים קובץ עם אותו שם — הוא יימחק וייבנה מחדש.
                                                              // .File.Create() == מחזירה אובייקט מסוג FileStream — זהו זרם נתונים (Stream) שמאפשר לכתוב או לקרוא נתונים מקובץ באופן רציף, "זרם אחרי זרם" של בתים (bytes).
                                                              // שומר את אותו זרם,  (stream) במשתנה בשם  stream .  אנחנו פותחים "צינור כתיבה" חדש לקובץ ריק בשרת, ומוודאים שהוא ייסגר אוטומטית כשתיגמר ההעלאה.
        await file.CopyToAsync(stream); // הוא קורא את הבתים מתוך הקובץ שהגיע בבקשה וכותב אותם לתוך הקובץ הפיזי החדש שפתחנו בדיסק. מתבצעת ההעתקה בפועל — וההעלאה של הקובץ לשרת.
                                        // file == הוא האובייקט שקיבלנו מהמשתמש — IFormFile — שמייצג את הקובץ שהועלה דרך הבקשה (multipart/form-data).
                                        // CopyToAsync (stream); == מעתיק את תוכן הקובץ (file) לתוך זרם היעד (stream) בצורה אסינכרונית.
        var url = $"/uploads/ {filename}"; // נבנה כאן  URL ציבורי לגישה לקובץ שהועלה
                                           // $"…." === אומר שזו מחרוזת עם ביטוי פנימי
                                           // בתוך הסוגריים המסולסלים {} מוחדר הערך של המשתנה     filename.
                                           // התיקייה  uploads מוגדרת מראש בתוכנית (Program.cs) כך שתהיה נגישה לציבור דרך  app.UseStaticFiles();.   לכן, כתובת זו יכולה לשמש ישירות בדפדפן כדי להוריד או להציג את הקובץ.
        return Ok(new { url }); // ok == מחזירה תגובה של  Http של  ok שהוא קוד 200.
                                // (new { url });  ==== בתוך הסוגריים, מחזירים אובייקט אנונימי (object) עם תכונה אחת בשם  url.   בפועל, זה יחזור ללקוח כ־  JSON, לדוגמה:      "url": "/uploads/abc123_invoice.pdf".
    }
}


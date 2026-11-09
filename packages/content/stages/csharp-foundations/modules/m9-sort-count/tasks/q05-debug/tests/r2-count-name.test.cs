public class R2CountNameTests
{
    [Fact(DisplayName = "R2 名前の件数")]
    public void R2CountName()
    {
        Assert.Equal(0, Answers.R2CountName(new string[] { "red" }, "missing"));
        Assert.Equal(2, Answers.R2CountName(new string[] { "red", "blue", "red" }, "red"));
        Assert.Equal(0, Answers.R2CountName(new string[] { }, "red"));
        Assert.Equal(1, Answers.R2CountName(new string[] { "Tom", "tom" }, "Tom"));
    }
}

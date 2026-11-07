public class R2HeadTests
{
    [Fact(DisplayName = "R2 先頭2文字")]
    public void R2Head()
    {
        Assert.Equal("Err", Answers.R2Head("A"));
        Assert.Equal("Err", Answers.R2Head(""));
        Assert.Equal("ab", Answers.R2Head("ab"));
        Assert.Equal("ab", Answers.R2Head("abcd"));
    }
}

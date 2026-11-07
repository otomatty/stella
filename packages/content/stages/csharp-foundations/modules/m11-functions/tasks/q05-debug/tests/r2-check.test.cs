public class R2CheckTests
{
    [Fact(DisplayName = "R2 4桁の判定")]
    public void R2Check()
    {
        Assert.Equal("Err", Answers.R2Check("abc"));
        Assert.Equal("", Answers.R2Check("0123"));
        Assert.Equal("Err", Answers.R2Check("12a4"));
        Assert.Equal("Err", Answers.R2Check(""));
    }
}

public class S08CheckCodeTests
{
    [Fact(DisplayName = "S08 コードの判定")]
    public void S08CheckCode()
    {
        Assert.Equal("[]",  "[" + Answers.S08CheckCode("0123") + "]");
        Assert.Equal("[Err]",  "[" + Answers.S08CheckCode("12a4") + "]");
        Assert.Equal("[Err]",  "[" + Answers.S08CheckCode("") + "]");
        Assert.Equal("[]",  "[" + Answers.S08CheckCode("123456") + "]");
        Assert.Equal("[Err]",  "[" + Answers.S08CheckCode("123") + "]");
    }
}

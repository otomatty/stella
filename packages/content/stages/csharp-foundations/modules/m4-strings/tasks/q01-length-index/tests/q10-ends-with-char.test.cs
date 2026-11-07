public class Q10EndsWithCharTests
{
    [Fact(DisplayName = "Q10 末尾が文字 c か")]
    public void Q10EndsWithChar()
    {
        Assert.Equal(true, Answers.Q10EndsWithChar("abc", 'c'));
        Assert.Equal(false, Answers.Q10EndsWithChar("abc", 'a'));
        Assert.Equal(true, Answers.Q10EndsWithChar("x", 'x'));
    }
}

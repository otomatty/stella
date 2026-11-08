public class S10SameEndsTests
{
    [Fact(DisplayName = "S10 同じ端")]
    public void S10SameEnds()
    {
        Assert.Equal(true, Answers.S10SameEnds("aba"));
        Assert.Equal(false, Answers.S10SameEnds("a"));
        Assert.Equal(false, Answers.S10SameEnds(""));
        Assert.Equal(true, Answers.S10SameEnds("aa"));
        Assert.Equal(false, Answers.S10SameEnds("ab"));
    }
}
